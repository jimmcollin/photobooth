(() => {
  const video = document.getElementById("video");
  const startBtn = document.getElementById("startCameraBtn");
  const stopBtn = document.getElementById("stopCameraBtn");
  const captureBtn = document.getElementById("captureBtn");

  const photosDiv = document.getElementById("photos");
  const selectBtn = document.getElementById("selectImageBtn");
  const selectForm = document.getElementById("selectImageForm");
  const selectedDataUrlInput = document.getElementById("selectedDataUrl");

  let stream = null;
  let selectedCard = null;
  let selectedDataUrl = null;

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
    // If you're not on localhost, this will fail unless HTTPS.
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
  }

  function stopCamera() {
    if (!stream) return;
    stream.getTracks().forEach(t => t.stop());
    stream = null;
    video.srcObject = null;
  }

  function capturePhoto() {
    if (!video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.8  );

    const card = document.createElement("div");
    card.className = "border rounded p-2 mb-2";
    card.style.cursor = "pointer";
    card.dataset.dataUrl = dataUrl;

    const img = document.createElement("img");
    img.src = dataUrl;
    img.className = "img-fluid rounded";
    card.appendChild(img);

    registerSelectable(card, dataUrl);

    // card.addEventListener("click", () => {
    //   if (selectedCard) selectedCard.classList.remove("border-success");
    //   selectedCard = card;
    //   selectedCard.classList.add("border-success");
    // });

    photosDiv.prepend(card);
  }

  startBtn?.addEventListener("click", (e) => { e.preventDefault(); startCamera().catch(console.error); });
  stopBtn?.addEventListener("click", (e) => { e.preventDefault(); stopCamera(); });
  captureBtn?.addEventListener("click", (e) => { e.preventDefault(); capturePhoto(); });

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

   if (!res.ok){
    console.error("Upload failed:", res.status, res.statusText);
    alert("Image upload failed. Please try again.");
    return; 
  }

}

})();
