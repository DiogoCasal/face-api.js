const video = document.getElementById('video')

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models'),
  faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models')
]).then(startVideo)

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => video.srcObject = stream,
    err => console.error(err)
  )
}

function loadLabeledImages() {
  const labels = ['Didi', 'Jhones']
  return Promise.all(
    labels.map(async label => {
      const descriptions = []
      for (let i = 1; i <= 5; i++) {
        const img = await faceapi.fetchImage(`https://raw.githubusercontent.com/DiogoCasal/face-api.js/refs/heads/master/labeled_images/${label}/${i}.jpg`)
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
        descriptions.push(detections.descriptor)
      }

      return new faceapi.LabeledFaceDescriptors(label, descriptions)
    })
  )
}

video.addEventListener('play', async () => {
  const canvas = faceapi.createCanvasFromMedia(video)
  document.body.append(canvas)
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)
  
  const labeledFaceDescriptors = await loadLabeledImages()
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.5)
    
    setInterval(async () => {
      canvas.getContext('2d').drawImage(video, 0, 0);
      const bas64ImageData = canvas.toDataURL('image/webp');
      const base64Response = await fetch(bas64ImageData);
      const blob = await base64Response.blob();
      const img = await faceapi.bufferToImage(blob);
      const detections2 = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors()
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const results = detections2?.map(d => faceMatcher.findBestMatch(d.descriptor))
      results.forEach((result, i) => {
        const box = detections2[i].detection.box
        if (result._label != 'unknown'){
          console.log(result._label + ' foi identificado')
        }
        const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() })
        drawBox.draw(canvas)
        // faceapi.draw.drawText(canvas, result.toString())
      })
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      faceapi.draw.drawDetections(canvas, resizedDetections)
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
  }, 100)
})