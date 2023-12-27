let settingObject = {
  // api_url: 'https://api.openai.com',
  api_url: "https://api.openai.com",
  api_urls: ["https://api.openai.com", ""],
  api_key: "sk-",
  model: "gpt-3.5-turbo-16k",
  models: ["gpt-3.5-turbo-16k", "gpt-4", "gpt-4-turbo"],
  speaker: "shimmer",
  speakers: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
  ttsModel: "tts-1",
  ttsModels: ["tts-1", "tts-1-hd"],
  ttsSpeed: "1.2",
  max_token: 80,
  autotts: "yes",
  //   deepgramurl:
  //     "https://corsrp.suisuy.eu.org/https://tender-pinafore-crow.cyclic.app",
  deepgramurl: "",
  usedeepgram: "yes",
};

const urlParams = new URLSearchParams(window.location.search);
for (const [key, value] of urlParams) {
  if (settingObject.hasOwnProperty(key)) {
    settingObject[key] = value;
  }
}
console.log("updated from urlParams", settingObject);

setTimeout(() => {
  test();
}, 1000);

const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
// const voiceButton = document.getElementById('voice-button');
const ttsButton = document.getElementById("tts-button");
let ttsAudio = document.querySelector("#ttsAudio");
// let recordButton = document.querySelector('#record-button');
let statusDiv = document.querySelector("#statusDiv");

let messages = [];

sendButton.addEventListener("click", () => {
  let message = userInput.value;
  if (message.length <= 0) {
    message = "continue";
  }
  displayUserMessage(message);
  getAIResponseStream(message, settingObject.model);
  userInput.value = "";
});
ttsButton.addEventListener("click", () => {
  convertToSpeechStreamed(
    userInput.value,
    ttsAudio,
    (model = settingObject.speaker),
  );
});

function displayUserMessage(message) {
  const messageDiv = document.createElement("div");
  const copyButton = createCopyButton(message);
  const TTSButton = createTTSButton(message);

  messageDiv.textContent = message;
  messageDiv.innerHTML += "<br>";
  messageDiv.className = "message";
  messageDiv.appendChild(copyButton);
  messageDiv.appendChild(TTSButton);

  chatWindow.prepend(messageDiv);
  //   chatWindow.scrollTop = chatWindow.scrollHeight;
}

function displayAIResponse(message) {
  const messageDiv = document.createElement("div");
  const copyButton = createCopyButton(message);
  const TTSButton = createTTSButton(message);

  messageDiv.textContent = message;
  messageDiv.className = "message";
  messageDiv.appendChild(copyButton);
  messageDiv.appendChild(TTSButton);
  if (settingObject.autotts === "yes") {
    TTSButton.click();
  }
  chatWindow.prepend(messageDiv);
  //   chatWindow.scrollTop = chatWindow.scrollHeight;
}

/*
  gpt-3.5-turbo
  gpt-4
  curl ${settingObject.api_url}/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
    "model": "gpt-4-1106-preview",
    "messages": [
      {
        "role": "user",
        "content": ""
      }
    ],
    "temperature": 1,
    "max_tokens": 256,
    "top_p": 1,
    "frequency_penalty": 0,
    "presence_penalty": 0
  }'
  */
async function getAIResponse(message, model = "gpt-3.5-turbo") {
  messages = [
    ...messages,
    {
      role: "user",
      content: message,
    },
  ];

  const data = {
    model: model,
    messages: messages,
    temperature: 1,
    max_tokens: 100,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };
  console.log(data.messages);

  const response = await fetch(`${settingObject.api_url}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settingObject.api_key}`,
    },
    body: JSON.stringify(data),
  });

  if (response.ok) {
    const data = await response.json();
    displayAIResponse(data.choices[0].message.content);
    messages = [
      ...messages,
      {
        role: "assistant",
        content: data.choices[0].message.content,
      },
    ];
  } else {
    displayAIResponse("Sorry, there was an error processing your message.");
  }
}

async function getAIResponseStream(message, model = "gpt-3.5-turbo") {
  messages = [
    ...messages,
    {
      role: "user",
      content: message,
    },
  ];

  const data = {
    model: model,
    messages: messages,
    temperature: 1,
    max_tokens: 100,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };
  console.log(data.messages);

  const messageDiv = document.createElement("div");

  messageDiv.textContent = "";
  messageDiv.className = "message";
  chatWindow.prepend(messageDiv);

  streamedgpt(
    messages,
    (newMsg, deltaMsg) => {
      messageDiv.textContent += deltaMsg;
    },
    (config = {
      model: settingObject.model,
      temperature: 0.7,
      max_tokens: settingObject.max_token,
      API_KEY: settingObject.api_key,
      API_URL: `${settingObject.api_url}/v1/chat/completions`,
    }),
    () => {
      messages = [
        ...messages,
        {
          role: "assistant",
          content: messageDiv.textContent,
        },
      ];
      const copyButton = createCopyButton(messageDiv.textContent);
      const TTSButton = createTTSButton(messageDiv.textContent);
      messageDiv.appendChild(copyButton);
      messageDiv.appendChild(TTSButton);
      if (settingObject.autotts === "yes") {
        TTSButton.click();
      }
    },
  ).generate();
}

//utils
// This function creates a copy button and attaches a click event to it
function createCopyButton(text) {
  const button = document.createElement("button");
  button.textContent = "Copy";
  button.className = "copy-button";
  button.addEventListener("click", () => {
    copyTextToClipboard(text);
    button.textContent = "Copyed";
  });
  button.addEventListener("pointerdown", () => {
    let originalCorl = button.style.backgroundColor;
    button.style.backgroundColor = "green";
    setTimeout(() => {
      button.style.backgroundColor = originalCorl;
    }, 500);
  });
  return button;
}

//utils
// This function creates a copy button and attaches a click event to it
function createCopyButton(text) {
  const button = document.createElement("button");
  button.textContent = "Copy";
  button.className = "copy-button";
  button.addEventListener("click", () => {
    copyTextToClipboard(text);
    button.textContent = "Copyed";
  });
  button.addEventListener("pointerdown", () => {
    let originalCorl = button.style.backgroundColor;
    button.style.backgroundColor = "green";
    setTimeout(() => {
      button.style.backgroundColor = originalCorl;
    }, 500);
  });
  return button;
}

// This function copies the given text to the clipboard
function copyTextToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      console.log("Text copied to clipboard");
    })
    .catch((err) => {
      console.log("Error in copying text: ", err);
    });
}

//tts
function createTTSButton(text) {
  const button = document.createElement("button");
  const audio = document.createElement("audio");
  button.textContent = "TTS";
  button.className = "tts-button";
  button.addEventListener("click", () => {
    //todo tts
    if (button.textContent !== "TTS") {
      audio.play();
      return;
    }
    button.textContent = "TTS...";
    convertToSpeechStreamed(text, audio, (model = settingObject.speaker));
  });
  button.addEventListener("pointerdown", () => {
    let originalCorl = button.style.backgroundColor;
    button.style.backgroundColor = "green";
    setTimeout(() => {
      button.style.backgroundColor = originalCorl;
    }, 500);
  });

  button.appendChild(audio);

  return button;
}

function convertToSpeech(
  text,
  audio,
  speaker = "echo",
  ttsModel = settingObject.ttsModel,
) {
  console.log("start convertToSpeedch()");

  fetch(`${settingObject.api_url}/v1/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settingObject.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ttsModel,
      input: text,
      voice: speaker,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      audio.src = url;
      audio.play();

      //const a = document.createElement("a");
      // a.href = url;
      // a.download = "speech.mp3";
      // document.body.appendChild(a);
      // a.click();
      // window.URL.revokeObjectURL(url);
    })
    .catch((error) => console.error("Error:", error));
}

async function convertToSpeechStreamed(
  text = "this is test",
  audio = ttsAudio,
  speaker = "echo",
  ttsModel = settingObject.ttsModel,
) {
  console.log("start convertToSpeedch()");

  fetch(`${settingObject.api_url}/v1/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settingObject.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ttsModel,
      input: text,
      voice: speaker,
      stream: true,
      speed: settingObject.ttsSpeed,
    }),
  })
    .then(async (response) => {
      console.log(
        "convertToSpeechStreamed: te",
        response.headers.get("Transfer-Encoding"),
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      var mediaSource = new MediaSource();
      audio.src = URL.createObjectURL(mediaSource);

      // Add an event listener for when the MediaSource is opened
      mediaSource.addEventListener("sourceopen", async () => {
        // Create a function that returns a promise that resolves when the source buffer is ready
        function waitForUpdateEnd(sourceBuffer) {
          return new Promise((resolve) => {
            // If the source buffer is not updating, resolve immediately

            setTimeout(() => {
              resolve();
            }, 100);
          });
        }

        // Use an async function to append buffers to the source buffer
        async function appendBuffer(sourceBuffer, buffer) {
          // Wait for the source buffer to be ready
          await waitForUpdateEnd(sourceBuffer);
          // Append the buffer
          sourceBuffer.appendBuffer(buffer);
        }

        // Create a source buffer for the MP3 mime type
        var sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");

        // Get the reader from the response body
        let reader = response.body.getReader();
        let audioData = new Uint8Array();

        // Loop through the chunks of data
        while (true) {
          const { done, value } = await reader.read();

          // If there is no more data, end the stream and break the loop
          if (done) {
            const audioBlob = new Blob([audioData], { type: "audio/mpeg" });
            audio.addEventListener(
              "ended",
              () => {
                audio.src = URL.createObjectURL(audioBlob);
                audio.pause();
              },
              { once: true },
            );
            setTimeout(() => {
              mediaSource.endOfStream();
            }, 1000);

            break;
          }

          // Append the data to the source buffer
          audioData = new Uint8Array([...audioData, ...value]);
          await appendBuffer(sourceBuffer, value);
          audio.play();
        }
      });
    })
    .catch((error) => console.error("Error:", error));
}

//setting
// ... (The rest of your script)

// Model selection logic

const settingsButton = document.getElementById("settings-button");
const settingsModal = document.getElementById("settings-modal");
const closeButton = document.getElementsByClassName("close-button")[0];
const modelSelector = document.getElementById("model-selector");
const saveSettingsButton = document.getElementById("save-settings");

settingsButton.onclick = function () {
  messages = [];
  settingsModal.style.display = "block";
};

closeButton.onclick = function () {
  settingsModal.style.display = "none";
};

saveSettingsButton.onclick = function () {
  const voiceForm = document.getElementById("voice-form");
  const selectedVoice = voiceForm.elements["voice"].value;

  settingObject.model = modelSelector.value;
  settingObject.speaker = selectedVoice; // Set the global variable to the selected voice
  settingObject.api_key = document.querySelector("#apiKeyInput").value;

  settingsModal.style.display = "none";
  checkAPIKey(settingObject.api_key);

  console.log(`Voice set to: ${selectedVoiceName}`);
  console.log(` set to:`, settingObject);
};

window.onclick = function (event) {
  if (event.target == settingsModal) {
    settingsModal.style.display = "none";
  }
};

let selectedVoiceName = "";

const voiceSettingsModal = document.getElementById("voice-settings-modal");
const voiceSelector = document.getElementById("voice-selector");
const saveVoiceSettingsButton = document.getElementById("save-voice-settings");

// ... (The rest of your script)

// Make sure to update your fetch call to use the `model` variable

document.querySelectorAll("button").forEach((button) => {
  button.addEventListener(
    "contextmenu",
    function (event) {
      event.preventDefault(); // Prevents the default context menu from showing
    },
    false,
  );

  button.addEventListener("pointerdown", () => {
    let originalCorl = button.style.backgroundColor;
    button.style.backgroundColor = "green";
    setTimeout(() => {
      button.style.backgroundColor = originalCorl;
    }, 500);
  });
});

function streamedgpt(
  msgs = [{ role: "user", content: "hi" }],
  onMessageFunction = (newMsg, deltaMsg) => {
    console.log(newMsg, deltaMsg);
  },

  config = {
    model: "gpt3-turbo-16k",
    temperature: 0.7,
    max_tokens: 100,
    API_KEY: settingObject.api_key,
    API_URL: `${settingObject.api_url}/chat/completions`,
  },
  finishListener = () => {
    console.log("finished");
  },
) {
  const API_URL =
    config.API_URL || "https://gptapi.suisuy.eu.org/chat/completions";
  const API_KEY = config.API_KEY || "YOUR_API_KEY";

  let controller = null; // Store the AbortController instance

  const generate = async () => {
    // Create a new AbortController instance
    controller = new AbortController();
    const signal = controller.signal;

    try {
      // Fetch the response from the OpenAI API with the signal from AbortController
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: msgs,
          max_tokens: config.max_tokens,
          stream: true, // For streaming responses
        }),
        signal, // Pass the signal to the fetch request
      });

      console.log("streamgpt(): te", response.headers.get("Transfer-Encoding"));
      // Read the response as a stream of data
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let totalMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        // Massage and parse the chunk of data
        const chunk = decoder.decode(value);

        const lines = chunk.split("\n");
        const parsedLines = lines
          .map((line) => line.replace(/^data: /, "").trim()) // Remove the "data: " prefix
          .filter((line) => line !== "" && line !== "[DONE]") // Remove empty lines and "[DONE]"
          .map((line) => JSON.parse(line)); // Parse the JSON string

        for (const parsedLine of parsedLines) {
          const { choices } = parsedLine;
          const { delta } = choices[0];
          const { content } = delta;
          // Update the UI with the new content
          if (content) {
            totalMessage += content;
            onMessageFunction(totalMessage, content);
          }
        }
      }
    } catch (error) {
      console.error(error);
      // Handle fetch request errors
      if (signal.aborted) {
        totalMessage = "Request aborted.";
      } else {
        console.error("Error:", error);
        totalMessage = "Error occurred while generating.";
      }
    } finally {
      // Enable the generate button and disable the stop button
      controller = null; // Reset the AbortController instance
      finishListener();
    }
  };

  const stop = () => {
    // Abort the fetch request by calling abort() on the AbortController instance
    if (controller) {
      controller.abort();
      controller = null;
    }
  };

  return { generate, stop };
}

setInterval(() => {
  if (userInput.value.length > 0) {
    sendButton.innerText = "Send";
  } else {
    sendButton.innerText = "continue";
  }

  if (statusDiv.style.display !== "none") {
    statusDiv.style.display = "none";
  }
  if (isRecording) {
    statusDiv.style.display = "block";
  }
}, 1000);

function checkAPIKey(api_key) {
  const apiKey = api_key; // Replace 'YOUR_API_KEY' with your actual OpenAI API key

  let api_key_statusdiv = document.querySelector("#api_key_statusdiv");

  fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        console.log("Your API key is not working.");
        api_key_statusdiv.innerHTML = "Your API key is not working";
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log(data);
      // Process the data here
      console.log("Your API key is working.");
      api_key_statusdiv.innerHTML = "Your API key is  working";
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

//setting ui
const settingsContainer = document.getElementById("settingsContainer");

var textarea = document.getElementById("user-input");
var undoStack = [];
var redoStack = [];

setInterval(() => {
  if (userInput.value !== undoStack[undoStack.length - 1]) {
    undoStack.push(userInput.value);
  }
}, 1000);

function copyToClipboard() {
  textarea.select();
  document.execCommand("copy");
}

function pasteFromClipboard() {
  navigator.clipboard
    .readText()
    .then(function (text) {
      textarea.value += text;
    })
    .catch(function (err) {
      console.error("Unable to paste from clipboard", err);
    });
}

function clearTextarea() {
  undoStack.push(textarea.value);
  textarea.value = "";
}

function undo() {
  if (undoStack.length > 0) {
    redoStack.push(textarea.value);
    textarea.value = undoStack.pop();
  }
}

function redo() {
  if (redoStack.length > 0) {
    undoStack.push(textarea.value);
    textarea.value = redoStack.pop();
  }
}

function test() {
  // userInput.value = "Hello, how are you?";
  // sendButton.click();
  checkAPIKey(settingObject.api_key);
  // convertToSpeechStreamed(
  //   (text = 'hello lets start'),
  //   (audio = ttsAudio),
  //   (speaker = 'echo'),
  //   (ttsModel = settingObject.ttsModel)
  // );
}
