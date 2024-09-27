var width = 450;
var height = 0; 
var streaming = false; 
var video = null;
var canvas = null;
var photo = null;
var photoContainer = null;
var photoForm = null;
var startButton = null;
var sendButton = null;
  
function startup() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    photo = document.getElementById('photo');
    photoContainer = document.getElementById('photoContainer');
    photoForm = document.getElementById('photoForm');
    startButton = document.getElementById('startButton');
    sendButton = document.getElementById('sendButton');
  
    navigator.mediaDevices.getUserMedia({video: true, audio: false})
        .then((stream) => {
            const cameraContainer = document.getElementById('cameraContainer');
            cameraContainer.classList.remove('invisible');
            cameraContainer.classList.add('container');

            video.srcObject = stream;
            video.play();
        }).catch(function(error) { console.log(error); });
  
    video.addEventListener('canplay', (e) => {
    if (!streaming) {
            height = video.videoHeight / (video.videoWidth/width);
            if (isNaN(height)) height = width / (4/3);
            video.setAttribute('width', width);
            video.setAttribute('height', height);
            canvas.setAttribute('width', width);
            canvas.setAttribute('height', height);
            streaming = true;
        }
    }, false);
  
    startButton.addEventListener('click', (e) =>{
        takePicture();
        e.preventDefault();
    }, false);

    sendButton.addEventListener('click', (e) =>{
        sendPicture();
        e.preventDefault();
    }, false);
}

function takePicture() {
    const context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    const data = canvas.toDataURL('image/png');
    photo.setAttribute('src', data);
    photoContainer.classList.remove('invisible');
    photoContainer.classList.add('container');
}

function sendPicture() {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/save';
    const hiddenField = document.createElement('input');
    hiddenField.type = 'hidden';
    hiddenField.name = 'photo';
    const data = canvas.toDataURL('image/png');
    hiddenField.value = data;
    form.appendChild(hiddenField);
    document.body.appendChild(form);
    form.submit();
}

window.addEventListener('load', startup, false);