(() => {
  const videoMobile = document.getElementById('videoMobile');
  const videoDesktop = document.getElementById('videoDesktop');
  const getVideoEl = () => (window.matchMedia('(max-width: 768px)').matches ? videoMobile : videoDesktop);

  const video = getVideoEl();

  const startOverlay = document.getElementById("cameraStartOverlay");
  const startOverlayBtn = document.getElementById("startCameraBtnOverlay");
  const shutterBtn = document.getElementById("shutterBtn");
  const uploadTriggerBtn = document.getElementById("uploadTriggerBtn");
  const flashEl = document.getElementById("captureFlash");
  const photoInput = document.getElementById("photoInput");

  const startDesktop = document.getElementById("startCameraBtn");
  const captureDesktop = document.getElementById("captureBtn");
  const stopDesktop = document.getElementById("stopCameraBtn");

  const sheetEl = document.getElementById("photoFlowSheet");
  const flowPreview = document.getElementById("flowPreview");
  const flowUseBtn = document.getElementById("flowUseBtn");
  const flowRetakeBtn = document.getElementById("flowRetakeBtn");
  const flowStepConfirm = document.getElementById("flowStepConfirm");
  const flowStepInfo = document.getElementById("flowStepInfo");

  let stream = null;
  let isCameraRunning = false;
  let selectedBlob = null;
  let selectedPreviewUrl = null;
  let uploadedViaUpload = false;

  function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function flash() {
    if (!flashEl) return;
    flashEl.classList.remove("is-on");
    void flashEl.offsetWidth;
    flashEl.classList.add("is-on");
  }

  function showStartOverlay(show) {
    if (!startOverlay) return;
    startOverlay.classList.toggle("is-hidden", !show);
  }

  function syncDesktopButtons() {
    if (!startDesktop || !captureDesktop || !stopDesktop) return;
    startDesktop.disabled = isCameraRunning;
    captureDesktop.disabled = !isCameraRunning;
    stopDesktop.disabled = !isCameraRunning;
  }

  async function startCamera() {
    const videoEl = getVideoEl();
    if (!videoEl) return;
    if (isCameraRunning) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      videoEl.srcObject = stream;
      isCameraRunning = true;

      if (shutterBtn) shutterBtn.disabled = false;
      showStartOverlay(false);
      syncDesktopButtons();
    } catch (err) {
      // Usually requires a user gesture on iOS
      showStartOverlay(true);
      if (shutterBtn) shutterBtn.disabled = true;
      console.error(err);
    }
  }

  function stopCamera() {
    if (!stream) return;
    stream.getTracks().forEach(t => t.stop());
    stream = null;
    if (videoMobile) videoMobile.srcObject = null;
    if (videoDesktop) videoDesktop.srcObject = null;
    isCameraRunning = false;

    if (shutterBtn) shutterBtn.disabled = true;
    showStartOverlay(true);
    syncDesktopButtons();
  }

  function setSheetMode(mode) {
    if (!sheetEl) return;
    sheetEl.classList.toggle("is-info", mode === "info");
  }

  function openSheetConfirm(previewUrl) {
    if (flowPreview) flowPreview.src = previewUrl;

    setSheetMode("confirm");
    if (flowStepConfirm) flowStepConfirm.style.display = "";
    if (flowStepInfo) flowStepInfo.style.display = "none";

    if (sheetEl && window.bootstrap?.Offcanvas) {
      bootstrap.Offcanvas.getOrCreateInstance(sheetEl).show();
    }
  }

  function capturePhoto() {
    const videoEl = getVideoEl();
    if (!videoEl) return;
    if (!video?.videoWidth || !video?.videoHeight) return;

    flash();

    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoEl, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      selectedBlob = blob;
      uploadedViaUpload = false;

      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
      selectedPreviewUrl = URL.createObjectURL(blob);

      openSheetConfirm(selectedPreviewUrl);
    }, "image/jpeg", 0.85);
  }

  async function uploadCapturedToSession() {
    if (!selectedBlob) throw new Error("No photo selected.");
    const fd = new FormData();
    fd.append("image", selectedBlob, "photo.jpg");

    const res = await fetch("/photosession/select", {
      method: "POST",
      body: fd,
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Upload failed");
  }

  // v1: upload is immediate
  async function uploadFileImmediately(file) {
    const fd = new FormData();
    fd.append("photo", file, file.name || "upload.jpg");

    const res = await fetch("/photosession/upload", {
      method: "POST",
      body: fd,
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Upload failed");
  }

  uploadTriggerBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    photoInput?.click();
  });

  photoInput?.addEventListener("change", async () => {
    const file = photoInput.files?.[0];
    if (!file) return;

    selectedBlob = file;
    uploadedViaUpload = true;

    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    selectedPreviewUrl = URL.createObjectURL(file);

    openSheetConfirm(selectedPreviewUrl);

    try {
      await uploadFileImmediately(file);
    } catch (err) {
      alert(err.message || "Upload failed");
    }
  });

  shutterBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    capturePhoto();
  });

  startOverlayBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    startCamera();
  });

  startDesktop?.addEventListener("click", (e) => { e.preventDefault(); startCamera(); });
  captureDesktop?.addEventListener("click", (e) => { e.preventDefault(); capturePhoto(); });
  stopDesktop?.addEventListener("click", (e) => { e.preventDefault(); stopCamera(); });

  flowRetakeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    selectedBlob = null;
    uploadedViaUpload = false;
    if (sheetEl && window.bootstrap?.Offcanvas) bootstrap.Offcanvas.getOrCreateInstance(sheetEl).hide();
  });

  flowUseBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      if (!uploadedViaUpload) {
        await uploadCapturedToSession();
      }

      stopCamera();

      setSheetMode("info");
      if (flowStepConfirm) flowStepConfirm.style.display = "none";
      if (flowStepInfo) flowStepInfo.style.display = "";
      setTimeout(() => document.getElementById("memberName")?.focus(), 150);
    } catch (err) {
      alert(err.message || "Upload failed");
    }
  });

  window.addEventListener("load", () => {
    syncDesktopButtons();
    if (isMobile()) startCamera();
    // If blocked, overlay will remain visible and user can tap start.
  });

  const comment = document.getElementById("comment");
  const counter = document.getElementById("commentCount");

  if (comment && counter) {
    comment.addEventListener("input", () => {
      const len = comment.value.length;
      counter.textContent = len;
      counter.classList.toggle("warn", len > 480);
    });
  }

})();