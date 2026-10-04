// arrays to store sound objects, analyzers, and their extracted features
let sounds = [];
let analyzers = [];
let features = [{}, {}, {}];
let currentSoundIndex = -1;

// what each sound's feature controls (shown under the buttons)
const mappings = [
  { feature: 'spectral centroid', key: 'spectralCentroid', visual: 'colour' },
  { feature: 'RMS', key: 'rms', visual: 'size' },
  { feature: 'zero-crossing rate', key: 'zcr', visual: 'border' }
];

function preload() {
  soundFormats('mp3', 'wav');
  sounds[0] = loadSound('audio/sound1.wav');
  sounds[1] = loadSound('audio/sound2.wav');
  sounds[2] = loadSound('audio/sound3.wav');
}


function setup() {
  createCanvas(800, 400).parent('canvas-holder');
  colorMode(HSB, 360, 100, 100);
  background(0);

  // creating a Meyda analyzer for each sound
  for (let i = 0; i < 3; i++) {
    analyzers[i] = Meyda.createMeydaAnalyzer({
      audioContext: getAudioContext(),
      source: sounds[i],
      bufferSize: 512,
      featureExtractors: ['spectralCentroid', 'rms', 'zcr'],
      callback: (f) => {
        features[i] = f;
      }
    });

    // when a sound reaches its end, go back to the idle state
    sounds[i].onended(() => {
      if (currentSoundIndex === i && !sounds[i].isPaused()) {
        analyzers[i].stop();
        currentSoundIndex = -1;
        updateUi();
      }
    });
  }
}

// drawing visualization based on current audio features
function draw() {
  background(0, 0, 10, 0.2);

  if (currentSoundIndex === -1) return;

  let f = features[currentSoundIndex];

  let size = 100;
  let hue = 200;
  let border = 2;

  // Sound 0: color hue based on spectral centroid
  if (currentSoundIndex === 0 && f.spectralCentroid) {
    hue = map(f.spectralCentroid, 0, 100, 0, 360);
  }

  // Sound 1: rectangle size based on RMS (loudness)
  if (currentSoundIndex === 1 && f.rms) {
    size = map(f.rms, 0, 0.3, 50, 400);
  }

  // Sound 2: border thickness based on zero crossing rate
  if (currentSoundIndex === 2 && f.zcr) {
    border = map(f.zcr, 0, 100, 1, 20);
  }

  stroke(0, 0, 100);
  strokeWeight(border);
  fill(hue, 80, 100);
  rectMode(CENTER);
  rect(width / 2, height / 2, size, size);

  if (frameCount % 6 === 0) updateCaption(f);
}

function togglePlay(index) {
  userStartAudio();

  // if another sound is already playing, stop it and its analyzer
  if (currentSoundIndex !== -1) {
    sounds[currentSoundIndex].pause();
    analyzers[currentSoundIndex].stop();
  }

  // if the same button is pressed again, stop everything
  if (currentSoundIndex === index) {
    currentSoundIndex = -1;
    updateUi();
    return;
  }

  // play selected sound and start its feature analyzer
  currentSoundIndex = index;
  sounds[index].play();
  analyzers[index].start();
  updateUi();
}

function updateUi() {
  document.querySelectorAll('.buttons button').forEach((b, i) => {
    b.classList.toggle('active', i === currentSoundIndex);
  });
  if (currentSoundIndex === -1) {
    document.getElementById('caption').textContent = 'Choose a sound to start.';
  }
}

function updateCaption(f) {
  const m = mappings[currentSoundIndex];
  const value = f[m.key];
  document.getElementById('caption').textContent =
    `Sound ${currentSoundIndex + 1}: ${m.feature} ${value === undefined ? '…' : value.toFixed(m.key === 'rms' ? 3 : 1)} → ${m.visual}`;
}
