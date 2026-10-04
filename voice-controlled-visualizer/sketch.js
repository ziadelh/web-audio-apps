let music;
let fft;
let meyda;
let extracted = {};

let canvasColor = 'black';
let shapeType = 'circle';
let voiceRec;
let spokenWords = "";
let speechSupported = false;

function preload() {
  music = loadSound('audio/kalte-ohren-remix.mp3');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);

  // fft analysis
  fft = new p5.FFT();
  fft.setInput(music);

  // meyda audio feature analysis
  meyda = Meyda.createMeydaAnalyzer({
    audioContext: getAudioContext(),
    source: music,
    bufferSize: 512,
    featureExtractors: ['rms'],
    callback: (features) => {
      extracted = features;
    }
  });
  meyda.start();

  // setting up voice recognition (Chrome and Edge)
  speechSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  if (speechSupported) {
    voiceRec = new p5.SpeechRec('en-US', interpretSpeech);
    voiceRec.continuous = true;
    voiceRec.interimResults = false;
    voiceRec.start();
  }

  userStartAudio().then(() => {
    music.loop();
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function interpretSpeech() {
  let command = voiceRec.resultString.toLowerCase().trim();
  spokenWords = command;

  // background color commands
  const colors = ['white', 'black', 'blue', 'red', 'green'];
  for (let c of colors) {
    if (command.includes(c)) {
      canvasColor = c;
    }
  }

  // shape change commands
  const shapes = ['circle', 'square', 'triangle', 'pentagon'];
  for (let s of shapes) {
    if (command.includes(s)) {
      shapeType = s;
    }
  }
}

function draw() {
  background(canvasColor);

  // drawing circle using RMS
  let energy = extracted.rms || 0.15;
  let size = map(energy, 0, 0.3, 50, 250);

  // dark shape on a white background, white shape on every other colour
  fill(canvasColor === 'white' ? 0 : 255);
  noStroke();
  push();
  translate(width / 2, height / 2);

  if (shapeType === 'circle') {
    ellipse(0, 0, size, size);
  } else if (shapeType === 'square') {
    rectMode(CENTER);
    rect(0, 0, size, size);
  } else if (shapeType === 'triangle') {
    triangle(-size / 2, size / 2, size / 2, size / 2, 0, -size / 2);
  } else if (shapeType === 'pentagon') {
    drawFiveSidedShape(size / 2);
  }

  pop();

  // Instruction box
  fill(0, 150);
  noStroke();
  rect(20, 20, 390, 90, 10);

  fill(255);
  textAlign(LEFT);
  textSize(14);
  text("Say one of the following:\n" +
       "Colors → Black, White, Red, Blue, Green\n" +
       "Shapes → Square, Triangle, Circle, Pentagon", 30, 40);

  // status line: what the recogniser last heard, or what to do next
  textAlign(CENTER);
  textSize(16);
  fill(canvasColor === 'white' ? 0 : 255);
  let status;
  if (!music.isPlaying()) {
    status = "Click anywhere to start the music";
  } else if (!speechSupported) {
    status = "Voice control needs Chrome or Edge";
  } else if (spokenWords) {
    status = 'Heard: "' + spokenWords + '"';
  } else {
    status = "Listening... (allow the microphone)";
  }
  text(status, width / 2, height - 40);
}

function drawFiveSidedShape(r) {
  beginShape();
  for (let i = 0; i < 5; i++) {
    let angle = (TWO_PI * i) / 5 - HALF_PI;
    vertex(r * cos(angle), r * sin(angle));
  }
  endShape(CLOSE);
}
