//voice record
const voiceButton = document.getElementById("voice-button");
let recordButton = document.querySelector("#record-button");
let visualizer = document.querySelector("#visualizer");

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let silenceAmplitudeThreshold = 8;
let minSilenceDuration = 1000;
let silentStart = Date.now();
let hasSound = false;

let oldVoiceColor = "black";

voiceButton.addEventListener("pointerdown", () => {
  voiceButton.style.backgroundColor = "green";
  startRecording((data) => {
    userInput.value = data.text;
    sendButton.click();
    voiceButton.style.backgroundColor = oldVoiceColor;
  });

  voiceButton.innerHTML = "Speaking";
});
voiceButton.addEventListener("pointerup", () => {
  stopRecording();
  voiceButton.style.backgroundColor = oldVoiceColor;

  voiceButton.innerHTML = "Voice";
});

let oldRecordColor = "blue";
recordButton.addEventListener("click", () => {
  userInput.value += "\n";
  toggleRecording();
});

// curl--request POST \
// --url ${settingObject.api_url}/v1/audio/transcriptions \
// --header 'Authorization: Bearer TOKEN' \
// --header 'Content-Type: multipart/form-data' \
// --form file =@/path/to/file/openai.mp3 \
// --form model = whisper - 1
// Function to convert speech to text using OpenAI's Whisper API
function convertToText(recordedFile, listener = console.log) {
  const formData = new FormData();
  formData.append("file", recordedFile);
  formData.append("model", "whisper-1");

  fetch(`${settingObject.api_url}/v1/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settingObject.api_key}`,
      // 'Content-Type': 'multipart/form-data' is not required with FormData
    },
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      // Process your data here

      listener(data);
      console.log(data);
    })
    .catch((error) => console.error("Error:", error));
}

function convertToTextDeepgram(recordedFile, listener = console.log) {
  const formData = new FormData();
  formData.append("audio", recordedFile);

  fetch(`${settingObject.deepgramurl}/tts`, {
    method: "POST",
    headers: {},
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      // Process your data here

      console.log(data);
      console.log(data.results.channels[0].alternatives[0].transcript);
      listener({
        text: data.results.channels[0].alternatives[0].transcript,
      });
    })
    .catch((error) => console.error("Error:", error));
}

let audioContext, analyserNode, dataArray, bufferLength;

// Function to visualize the sound wave
function visualizeAudio(stream) {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  analyserNode = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyserNode);
  analyserNode.fftSize = 512;
  bufferLength = analyserNode.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  setInterval(() => {
    drawVisualizerCircle();
  }, 300);
}

// Function to draw the sound wave
function drawVisualizer() {
  const canvas = document.getElementById("visualizer");
  const canvasCtx = canvas.getContext("2d");
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  analyserNode.getByteTimeDomainData(dataArray);

  canvasCtx.fillStyle = "rgb(200, 200, 200)";
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "rgb(0, 0, 0)";

  canvasCtx.beginPath();

  const sliceWidth = (WIDTH * 1.0) / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    //todo
    const v = dataArray[i] / 128.0;
    const y = v * HEIGHT * 0.5;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();
}

function drawVisualizerCircle() {
  const canvas = document.getElementById("visualizer");
  const canvasCtx = canvas.getContext("2d");
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  analyserNode.getByteTimeDomainData(dataArray);

  // Calculate the average volume
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    // console.log(dataArray[i]);
    const value = Math.abs(dataArray[i] - 128);
    sum += value;
  }
  const average = sum / bufferLength;

  // Clear the canvas
  canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

  // Set the fill style for the circle to some color
  canvasCtx.fillStyle = "rgb(255, 64, 64)"; // red circle, for example

  // Calculate the radius of the circle based on the average volume
  // You might need to tweak the multiplier to get a radius that works well for your audio levels
  const radius = average * 4 + 10; // Example: scale the average by the width of the canvas

  // Draw the circle
  canvasCtx.beginPath();
  canvasCtx.arc(WIDTH / 2, HEIGHT / 2, radius, 0, 2 * Math.PI);
  canvasCtx.fill();
}

// Update your startRecording function to include the visualizeAudio function
function startRecording(stopListener = console.log) {
  console.log("start recording, speak now");
  silentStart = Date.now();
  visualizer.style.display = "block";
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
      console.log(e.data);
    };
    mediaRecorder.onstop = (e) => {
      console.log("mediaRecorder onstop");
      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      audioChunks = [];
      const file = new File([audioBlob], "recordedAudio.wav", {
        type: "audio/wav",
      });
      if (hasSound === true) {
        if (settingObject.usedeepgram == "yes") {
          convertToTextDeepgram(file, stopListener);
        } else {
          convertToText(file, stopListener);
        }
        ttsAudio.src = URL.createObjectURL(file);
        hasSound = false;
      }

      mediaRecorder.stream.getTracks().forEach((track) => track.stop());

      // Stop the audio visualization when recording stops
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
    };
    mediaRecorder.start();
    isRecording = true;

    // Start visualizing the audio
    visualizeAudio(stream);
  });
}

// Function to toggle recording
function toggleRecording() {
  console.log("click");
  if (isRecording) {
    recordButton.style.backgroundColor = oldRecordColor;

    stopRecording();
    recordButton.innerHTML = "Rec";
  } else {
    recordButton.style.backgroundColor = "green";
    startRecording((data) => {
      userInput.value += data.text;
      recordButton.style.backgroundColor = oldRecordColor;

      //   sendButton.click();
    });
    recordButton.innerHTML = "...";
  }
}

// Function to stop recording
function stopRecording() {
  console.log("stop rec");
  visualizer.style.display = "none";
  mediaRecorder.stop();
  isRecording = false;
}

function getSilentTime() {
  if (!dataArray) return 0;
  if (isRecording !== true) {
    return 0;
  }
  const isSilent = dataArray.forEach((value) => {
    // console.log(value - 128);
    statusSpan.innerHTML = value - 128;
    if (Math.abs(value - 128) < silenceAmplitudeThreshold) {
      //
    } else {
      silentStart = Date.now();
      hasSound = true;
    }
  });
  statusSpan.innerHTML =
    isSilent +
    " <br>" +
    statusSpan.innerHTML +
    "<br> " +
    (Date.now() - silentStart);

  return Date.now() - silentStart;
}

setInterval(() => {
  if (getSilentTime() > minSilenceDuration && hasSound == true) {
    stopRecording();
    startRecording((data) => {
      userInput.value += "\n" + data.text;
      recordButton.style.backgroundColor = oldRecordColor;

      //   sendButton.click();
    });
  }

  if (getSilentTime() > 3000 && hasSound == false) {
    stopRecording();
    startRecording((data) => {
      userInput.value += "\n" + data.text;
      recordButton.style.backgroundColor = oldRecordColor;

      //   sendButton.click();
    });
  }
}, 150);

//end voice record
