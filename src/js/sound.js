let audioContext = null;
let soundEnabled = true;
let reverbNode = null;

function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a reverb effect using a simple feedback delay
    const delay1 = audioContext.createDelay(2);
    const delay2 = audioContext.createDelay(2);
    const feedback1 = audioContext.createGain();
    const feedback2 = audioContext.createGain();
    const dryGain = audioContext.createGain();
    const wetGain = audioContext.createGain();
    
    // Configure reverb
    delay1.delayTime.value = 0.03;
    delay2.delayTime.value = 0.07;
    feedback1.gain.value = 0.4;
    feedback2.gain.value = 0.3;
    dryGain.gain.value = 0.4;
    wetGain.gain.value = 0.6;
    
    // Connect reverb
    delay1.connect(feedback1);
    feedback1.connect(delay1);
    feedback1.connect(delay2);
    feedback2.connect(feedback2);
    feedback2.connect(wetGain);
    delay1.connect(wetGain);
    delay2.connect(wetGain);
    
    reverbNode = { dryGain, wetGain };
    
    // Create a master gain node to control overall volume
    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.5;
    dryGain.connect(masterGain);
    wetGain.connect(masterGain);
    masterGain.connect(audioContext.destination);
}

function playGunshotSound() {
    if (!soundEnabled || !audioContext) return;
    
    // Create a buffer for white noise
    const bufferSize = audioContext.sampleRate * 0.1;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    // Create a noise source
    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    
    // Create a filter to shape the sound
    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 300;
    bandpass.Q.value = 5;
    
    // Create an envelope for the sound
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.8, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    // Connect nodes: Source -> Filter -> Gain -> Dry/Wet Mixers
    noise.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(reverbNode.dryGain);
    gainNode.connect(reverbNode.wetGain);
    
    // Start and stop the sound
    noise.start(0);
    noise.stop(audioContext.currentTime + 0.1);
}

export { initAudio, playGunshotSound, soundEnabled, audioContext };
