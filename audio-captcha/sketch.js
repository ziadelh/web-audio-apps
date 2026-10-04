let voice;
let fft;
let mic;
let isSpeaking = false;
let currentCaptcha = "";
let submitted = false;

function setup() {
  let canvas = createCanvas(400, 100);
  canvas.parent('sketch-holder');
  noFill();

  // starting the audio system
  userStartAudio();

  voice = new p5.Speech();
  voice.setRate(0.8);

  // creates the first CAPTCHA when the page loads
  currentCaptcha = generateCaptcha(3);

  // starts microphone and set up FFT for waveform display
  mic = new p5.AudioIn();
  mic.start(() => {
    fft = new p5.FFT(0.9, 512);
    fft.setInput(mic);
  });

  // play button
  document.getElementById('play-btn').addEventListener('click', () => {

    if (submitted) {
      currentCaptcha = generateCaptcha(3);
      submitted = false;
    }
    setStatus("Listen and type what you hear.");

    // randomizing pitch for variation
    let pitch = random(0.9, 2.0);
    voice.setPitch(pitch);

    isSpeaking = true;
    voice.speak(currentCaptcha.split("").join(" "));
    voice.onEnd = () => isSpeaking = false;
  });

  // replay button
  document.getElementById('refresh-btn').addEventListener('click', () => {
    let pitch = random(0.9, 2.0);
    voice.setPitch(pitch);

    isSpeaking = true;
    voice.speak(currentCaptcha.split("").join(" "));
    voice.onEnd = () => isSpeaking = false;
  });

  // submit button
  document.getElementById('submit-btn').addEventListener('click', () => {
    const userInputRaw = document.getElementById('answer-box').value;

    // normalize user input to compare
    const normalizedInput = normalizeInput(userInputRaw);
    const normalizedCaptcha = normalizeInput(currentCaptcha);

    // result message
    if (normalizedInput === normalizedCaptcha) {
      setStatus("Correct! Press Play for a new code.");
    } else {
      setStatus("Incorrect. Press Replay to hear it again, or Play for a new code.");
    }

    // clear the input field
    document.getElementById('answer-box').value = "";
    submitted = true;
  });

  // Enter submits the answer
  document.getElementById('answer-box').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('submit-btn').click();
  });
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

function draw() {
  background(240);

  if (!isSpeaking || !fft) {
    noStroke();
    fill(130);
    textAlign(CENTER, CENTER);
    textSize(13);
    text(fft ? "The waveform appears while the code is spoken"
             : "Allow the microphone to see the waveform (optional)", width / 2, height / 2);
    noFill();
    return;
  }

  stroke(50);
  strokeWeight(2);

  let waveform = fft.waveform();

  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, width);
    let y = map(waveform[i], -1, 1, height, 0);
    vertex(x, y);
  }
  endShape();
}

// generates a CAPTCHA string
function generateCaptcha(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let captcha = "";
  for (let i = 0; i < length; i++) {
    captcha += chars.charAt(floor(random(chars.length)));
  }
  return captcha;
}

// converts user input and CAPTCHA
function normalizeInput(input) {
  const mapWordsToDigits = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9"
  };

  return input
    .toLowerCase()
    .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/g,
             match => mapWordsToDigits[match])
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .toUpperCase();
}
