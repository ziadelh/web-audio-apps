let soundFile;
let filter;
let distortion;
let delay;
let compressor;
let reverb;
let outputGain;
let recorder, recordedFile;
let isRecording = false;
let fftOriginal, fftProcessed;
let spectrumCanvas;
let masterVolume = 1.0;
let micIn = null;
let currentSource = 'file';

// "Output Level" slider of each effect (the lowest one sets the shared output gain)
const effectOutputs = { filter: 0.5, distortion: 1, delay: 1, compressor: 1, reverb: 1 };

function preload() {
  soundFormats('mp3', 'wav');
  soundFile = loadSound("sounds/sample1.mp3");
}

function setup() {
  spectrumCanvas = createCanvas(600, 220);
  let holder = document.getElementById('spectrum-canvas-holder');
  if (holder) {
    holder.appendChild(spectrumCanvas.elt);
  }

  filter = new p5.Filter('lowpass');
  distortion = new p5.Distortion();
  delay = new p5.Delay();
  compressor = new p5.Compressor();
  reverb = new p5.Reverb();
  outputGain = new p5.Gain();

  restoreFullChain();
  outputGain.amp(1, 0);

  document.getElementById("playBtn").onclick = () => {
    userStartAudio();
    if (!soundFile.isPlaying()) {
      restoreFullChain();
      soundFile.play();
    }
  };
  document.getElementById("pauseBtn").onclick = () => soundFile.pause();
  document.getElementById("stopBtn").onclick = () => soundFile.stop();
  document.getElementById("skipStartBtn").onclick = () => {
    userStartAudio();
    soundFile.stop();
    soundFile.jump(0);
    restoreFullChain();
    soundFile.play();
  };
  document.getElementById("skipEndBtn").onclick = () => {
    soundFile.stop();
    soundFile.jump(soundFile.duration() - 0.01);
  };
  let isLooping = false;
  document.getElementById("loopBtn").onclick = () => {
    isLooping = !isLooping;
    soundFile.setLoop(isLooping);
    document.getElementById("loopBtn").textContent = isLooping ? "Looping" : "Loop";
  };

  listen(["cutoffSlider", "resonanceSlider", "dryWetSlider", "outputSlider"], "input", updateFilter);
  listen(["distortionAmountSlider", "distortionDryWetSlider", "distortionOutputSlider"], "input", updateDistortion);
  listen(["distortionOversampleSlider"], "change", updateDistortion);
  listen(["delayTimeSlider", "delayFeedbackSlider", "delayFilterSlider", "delayDryWetSlider", "delayOutputSlider"], "input", updateDelay);
  listen(["compressorThresholdSlider", "compressorRatioSlider", "compressorKneeSlider", "compressorAttackSlider",
          "compressorReleaseSlider", "compressorDryWetSlider", "compressorOutputSlider"], "input", updateCompressor);
  listen(["reverbDurationSlider", "reverbDecaySlider", "reverbDryWetSlider", "reverbOutputSlider"], "input", updateReverb);
  listen(["reverbReverseCheckbox"], "change", updateReverb);

  recorder = new p5.SoundRecorder();
  recordedFile = new p5.SoundFile();
  recorder.setInput(outputGain);

  document.getElementById("recordBtn").onclick = () => {
    if (!isRecording) {
      recordedFile = new p5.SoundFile();
      recorder.setInput(outputGain);
      recorder.record(recordedFile);
      isRecording = true;
      document.getElementById("recordBtn").textContent = "Stop Recording";
    } else {
      recorder.stop();
      isRecording = false;
      document.getElementById("recordBtn").textContent = "Record";
      setTimeout(() => {
        recordedFile.save('processed_audio.wav');
      }, 500);
    }
  };

  fftOriginal = new p5.FFT(0.8, 1024);
  fftProcessed = new p5.FFT(0.8, 1024);
  fftOriginal.setInput(soundFile);
  fftProcessed.setInput(p5.soundOut);

  document.getElementById("masterVolumeSlider").addEventListener("input", (e) => {
    masterVolume = parseFloat(e.target.value);
    updateOutputGain();
  });

  document.getElementById("filterTypeSelector").addEventListener("change", (e) => {
    filter.setType(e.target.value);
    updateFilter();
    updateFilterTitle();
  });
  filter.setType('lowpass');
  updateFilterTitle();

  updateFilter();
  updateDistortion();
  updateDelay();
  updateCompressor();
  updateReverb();

  document.getElementById("audioSourceSelector").addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === 'mic') {
      switchToMic();
    } else {
      switchToFile();
    }
  });
}

function listen(ids, eventName, handler) {
  ids.forEach(id => document.getElementById(id).addEventListener(eventName, handler));
}

function draw() {
  background(245);
  let spectrumOrig = fftOriginal.analyze();
  stroke(0, 120, 255);
  noFill();
  beginShape();
  for (let i = 0; i < spectrumOrig.length; i++) {
    let x = map(i, 0, spectrumOrig.length - 1, 0, width / 2);
    let y = map(spectrumOrig[i], 0, 255, height - 10, 10);
    vertex(x, y);
  }
  endShape();
  let spectrumProc = fftProcessed.analyze();
  stroke(255, 100, 60);
  noFill();
  beginShape();
  for (let i = 0; i < spectrumProc.length; i++) {
    let x = map(i, 0, spectrumProc.length - 1, width / 2, width);
    let y = map(spectrumProc[i], 0, 255, height - 10, 10);
    vertex(x, y);
  }
  endShape();
}

// source -> filter -> distortion -> delay -> compressor -> reverb -> master volume -> output
function restoreFullChain() {
  try {
    soundFile.disconnect();
    filter.disconnect();
    distortion.disconnect();
    delay.disconnect();
    compressor.disconnect();
    reverb.disconnect();
    outputGain.disconnect();
  } catch (e) {}
  soundFile.connect(filter);
  filter.connect(distortion);
  distortion.connect(delay);
  delay.connect(compressor);
  compressor.connect(reverb);
  reverb.connect(outputGain);
  outputGain.connect(p5.soundOut);
}

function sliderValue(id) {
  return parseFloat(document.getElementById(id).value);
}

function updateFilter() {
  let cutoff = map(sliderValue("cutoffSlider"), 0, 1, 20, 20000);
  let resonance = map(sliderValue("resonanceSlider"), 0, 1, 0.001, 30);
  filter.freq(cutoff);
  filter.res(resonance);
  if (typeof filter.drywet === 'function') filter.drywet(sliderValue("dryWetSlider"));
  effectOutputs.filter = sliderValue("outputSlider");
  updateOutputGain();
}

function updateDistortion() {
  distortion.set(sliderValue("distortionAmountSlider"), document.getElementById("distortionOversampleSlider").value);
  if (typeof distortion.drywet === 'function') distortion.drywet(sliderValue("distortionDryWetSlider"));
  effectOutputs.distortion = sliderValue("distortionOutputSlider");
  updateOutputGain();
}

function updateDelay() {
  delay.delayTime(sliderValue("delayTimeSlider"));
  delay.feedback(sliderValue("delayFeedbackSlider"));
  delay.filter(sliderValue("delayFilterSlider"));
  if (typeof delay.drywet === 'function') delay.drywet(sliderValue("delayDryWetSlider"));
  effectOutputs.delay = sliderValue("delayOutputSlider");
  updateOutputGain();
}

function updateCompressor() {
  compressor.threshold(sliderValue("compressorThresholdSlider"));
  compressor.ratio(sliderValue("compressorRatioSlider"));
  compressor.knee(sliderValue("compressorKneeSlider"));
  compressor.attack(sliderValue("compressorAttackSlider"));
  compressor.release(sliderValue("compressorReleaseSlider"));
  if (typeof compressor.drywet === 'function') compressor.drywet(sliderValue("compressorDryWetSlider"));
  effectOutputs.compressor = sliderValue("compressorOutputSlider");
  updateOutputGain();
}

function updateReverb() {
  const reverse = document.getElementById("reverbReverseCheckbox").checked;
  // p5.Reverb.set() ignores reverse = false, so un-ticking the box would not turn it off
  reverb._reverse = reverse;
  reverb.set(sliderValue("reverbDurationSlider"), sliderValue("reverbDecaySlider"), reverse);
  if (typeof reverb.drywet === 'function') reverb.drywet(sliderValue("reverbDryWetSlider"));
  effectOutputs.reverb = sliderValue("reverbOutputSlider");
  updateOutputGain();
}

function updateOutputGain() {
  let minOut = Math.min(...Object.values(effectOutputs));
  let safeOutput = (minOut < 0.001) ? 0 : minOut;
  outputGain.amp(Math.pow(safeOutput, 2.5) * 3 * masterVolume, 0);
}

function updateFilterTitle() {
  const type = document.getElementById("filterTypeSelector").value;
  const names = { lowpass: 'Low-pass Filter', highpass: 'High-pass Filter', bandpass: 'Band-pass Filter' };
  document.getElementById('filterTitle').textContent = names[type];
}

function switchToMic() {
  userStartAudio();
  if (!micIn) {
    micIn = new p5.AudioIn();
    micIn.start(() => {
      routeMic();
    });
  } else {
    routeMic();
  }
  soundFile.stop();
  setPlaybackControlsEnabled(false);
  currentSource = 'mic';
}

function routeMic() {
  restoreFullChain();
  try {
    micIn.disconnect();
  } catch (e) {}
  micIn.connect(filter);
  fftOriginal.setInput(micIn);
}

function switchToFile() {
  if (micIn) {
    micIn.stop();
    try { micIn.disconnect(); } catch (e) {}
  }
  restoreFullChain();
  fftOriginal.setInput(soundFile);
  setPlaybackControlsEnabled(true);
  currentSource = 'file';
}

function setPlaybackControlsEnabled(enabled) {
  const ids = ["playBtn", "pauseBtn", "stopBtn", "skipStartBtn", "skipEndBtn", "loopBtn"];
  ids.forEach(id => {
    document.getElementById(id).disabled = !enabled;
  });
}
