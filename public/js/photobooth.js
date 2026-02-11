(() => {
    document.addEventListener("DOMContentLoaded", () => {

        const startBtn = document.getElementById("startCameraBtn");
        const captureBtn = document.getElementById("captureBtn");
        const stopBtn = document.getElementById("stopCameraBtn");
        const selectBtn = document.getElementById("selectImageBtn");

        if (startBtn) {
            startBtn.addEventListener("click", startCamera);
        }

        if (stopBtn) {
            stopBtn.addEventListener("click", stopCamera);
        }

        if (captureBtn) {
            captureBtn.addEventListener("click", capturePhoto);
        }
        if (selectBtn) {
            selectBtn.addEventListener("click", () => {
                const checked = document.querySelector('#photos input[type="checkbox"]:checked');
                if (!checked) return alert("Please select a photo first!");

                const photoDiv = checked.closest('.photo');
                const img = photoDiv.querySelector('img');
                const dataURL = img.src;

                document.getElementById('selectedDataUrl').value = dataURL;
                document.getElementById('selectImageForm').submit();    
            });
        }
    });
})();

function startCamera() {
    const video = document.getElementById('video');
    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                window.currentStream = stream; // Store the stream globally
                video.srcObject = stream;
            })
            .catch(error => {
                console.error("Something went wrong!", error);
            });
    } else {
        console.log("getUserMedia not supported on your browser!");
    }
};

function stopCamera() {
    const video = document.getElementById('video');
    if (window.currentStream) {
        window.currentStream.getTracks().forEach(track => track.stop());
        window.currentStream = null;
    }
    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                stream.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            })
            .catch(error => {
                console.error("Something went wrong!", error);
            });
    } else {
        console.log("getUserMedia not supported on your browser!");
    }
};

function capturePhoto() {
    const video = document.getElementById('video');
    const stream = video.srcObject;
    if (!stream) return;

    const tracks = stream.getTracks();
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    var dataURL = canvas.toDataURL('image/jpeg', 0.85);
    var photosContainer = document.getElementById('photos');

    var photoDiv = document.createElement('div');
    photoDiv.classList.add('photo');

    var img = document.createElement('img');
    img.src = dataURL;

    var selectCheckbox = document.createElement('input');
    selectCheckbox.type = 'checkbox';
    selectCheckbox.classList.add('photo-check');

    // click image toggles checkbox
    img.style.cursor = 'pointer';
    img.addEventListener('click', function () {
        selectCheckbox.checked = !selectCheckbox.checked;
        // trigger the same logic as manual checking
        selectCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // allow only ONE checked checkbox at a time
    selectCheckbox.addEventListener('change', function () {
        if (this.checked) {
            this.classList.add('input.photo-selected');
            photosContainer.querySelectorAll('input.photo-check').forEach(cb => {
                if (cb !== this) {
                    cb.checked = false;
                    cb.classList.remove('input.photo-selected');
                } 
            });
        }

        // update selected styling for all photo divs
        photosContainer.querySelectorAll('div.photo').forEach(div => {
            const cb = div.querySelector('input.photo-check');
            div.classList.toggle('selected', !!cb && cb.checked);
        });
    });
    photoDiv.appendChild(img);
    photoDiv.appendChild(selectCheckbox);

    photosContainer.appendChild(photoDiv);
   // video.srcObject = null;// your existing capture logic
};

function getSelectedImageDataUrl() {
    const photosContainer = document.getElementById('photos');
    const selected = photosContainer.querySelector('input.photo-check:checked');
    if (selected) {
        const img = selected.parentElement.querySelector('img');
        return img ? img.src : null;
    }
};

async function selectImage() {
    const dataURL = getSelectedImageDataUrl();
    if (!dataURL) return alert("Please select a photo first!");
    // Send the dataURL to the server
    const res = await fetch('/photosession/new', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: dataURL })
    });
   
    const {returnedUrl} = await res.json();
    window.location.href = returnedUrl;
}