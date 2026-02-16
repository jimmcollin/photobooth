(() => {
  const video = document.getElementById("video");
  const startBtn = document.getElementById("startCameraBtn");
  const stopBtn = document.getElementById("stopCameraBtn");
  const captureBtn = document.getElementById("captureBtn");
  const uploadForm = document.getElementById("selectImageForm") || document.querySelector("form[action*='/upload']");

  const photosDiv = document.getElementById("photos");
  const selectBtn = document.getElementById("selectImageBtn");
  // const selectForm = document.getElementById("selectImageForm");
  // const selectedDataUrlInput = document.getElementById("selectedDataUrl");

  let stream = null;
  let selectedCard = null;
  let selectedDataUrl = null;

  // Initialize button states on load
  function initializeButtonStates() {
    captureBtn.disabled = true;
    stopBtn.disabled = true;
    startBtn.disabled = false;
    if (uploadForm) uploadForm.disabled = false;
  }

  // Update button states when camera starts
  function enableCameraMode() {
    captureBtn.disabled = false;
    stopBtn.disabled = false;
    startBtn.disabled = true;
    if (uploadForm) uploadForm.disabled = true;
  }

  // Reset button states when camera stops
  function disableCameraMode() {
    captureBtn.disabled = true;
    stopBtn.disabled = true;
    startBtn.disabled = false;
    if (uploadForm) uploadForm.disabled = false;
  }

  function registerSelectable(card, dataUrl) {
    card.addEventListener("click", () => {
      document.querySelectorAll("#photos .border-success").forEach(c => c.classList.remove("border-success"));
      card.classList.add("border-success");
      selectedCard = card;
      selectedDataUrl = dataUrl;
    });
  }

  async function startCamera() {
    if (stream) return;
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    enableCameraMode();
  }

  function stopCamera() {
    if (!stream) return;
    stream.getTracks().forEach(t => t.stop());
    stream = null;
    video.srcObject = null;
    disableCameraMode();
  }

  function capturePhoto() {
    if (!video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    const card = document.createElement("div");
    card.className = "border rounded p-2 mb-2";
    card.style.cursor = "pointer";
    card.dataset.dataUrl = dataUrl;

    const img = document.createElement("img");
    img.src = dataUrl;
    img.className = "img-fluid rounded";
    card.appendChild(img);

    registerSelectable(card, dataUrl);

    photosDiv.prepend(card);
  }

  // Event listeners
  startBtn?.addEventListener("click", (e) => { 
    e.preventDefault(); 
    startCamera().catch(console.error); 
  });

  stopBtn?.addEventListener("click", (e) => { 
    e.preventDefault(); 
    stopCamera(); 
  });

  captureBtn?.addEventListener("click", (e) => { 
    e.preventDefault(); 
    capturePhoto(); 
  });

  selectBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    postSelectedImage().catch(console.error);
  });

  async function dataURLToBlob(dataUrl) {
    const [meta, b64] = dataUrl.split(",");
    const contentType = meta.match(/data:(.*?);base64/)[1];
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return new Blob([bytes], { type: contentType });
  }

  async function postSelectedImage() {
    if (!selectedDataUrl) {
      alert("Please click a photo in the gallery first.");
      return;
    }

    const blob = await dataURLToBlob(selectedDataUrl);
    const formData = new FormData();
    formData.append("image", blob, "frame.png");

    const res = await fetch("/photosession/select", {
      method: "POST",
      body: formData
    });

    if (res.redirected) {
      window.location.href = res.url;
      return;
    }

    if (!res.ok) {
      console.error("Upload failed:", res.status, res.statusText);
      alert("Image upload failed. Please try again.");
      return;
    }
  }

  // Initialize on page load
  initializeButtonStates();

})();
