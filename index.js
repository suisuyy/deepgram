const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { createClient } = require("@deepgram/sdk");
const cors = require("cors"); // Add this line

const app = express();
const upload = multer({ dest: "/tmp" });

const deepgramApiKey = "f42d2880e073808c439480b1458f53b170b90c37";

app.use(cors()); // Add this line
app.use(express.static("public"));

app.post("/", upload.single("audio"), async (req, res) => {
  const deepgram = createClient(deepgramApiKey);

  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
    fs.readFileSync(req.file.path),
    {
      smart_format: false,
      model: "whisper-large",
      detect_language: true,
      punctuate: true,
    },
  );

  if (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while transcribing the audio file.");
    return;
  }

  res.send(result);

  fs.unlinkSync(req.file.path);
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
