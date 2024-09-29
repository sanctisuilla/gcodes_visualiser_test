// Get references to HTML elements
const trackInputs = [document.getElementById('track1'), document.getElementById('track2')];
const switchButton = document.getElementById('switchButton');
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

// Audio context and variables
let audioCtx;
let analyser;
let dataArray;
let timeDomainArray;
let bufferLength;
let audioElements = [null, null];
let audioSources = [null, null];
let currentTrackIndex = 0;

// Variable to store the current playback time
let savedTime = 0;
let isVisualizing = false; // Flag to manage visualization state

// Initialize Audio Context on user interaction
function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Handle file uploads
trackInputs.forEach((input, index) => {
    input.addEventListener('change', event => {
        const file = event.target.files[0];
        if (file) {
            const fileURL = URL.createObjectURL(file);
            loadTrack(fileURL, index);
        }
    });
});

// Load and play the audio track
function loadTrack(url, index) {
    initAudioContext();

    // Create audio element
    const audio = new Audio();
    audio.src = url;
    audio.crossOrigin = 'anonymous';
    audio.loop = true; // Optional: Loop the audio

    // Create media element source
    const source = audioCtx.createMediaElementSource(audio);

    // Create analyser if not exists
    if (!analyser) {
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        timeDomainArray = new Uint8Array(bufferLength);
    }

    // Connect nodes
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    // Store references
    audioElements[index] = audio;
    audioSources[index] = source;

    // Auto-play if it's the first track loaded
    if (index === currentTrackIndex) {
        playTrack(index);
    }
}

// Play the selected track
function playTrack(index) {
    // Pause the other track and save the current time
    const otherIndex = (index + 1) % 2;
    if (audioElements[otherIndex]) {
        savedTime = audioElements[otherIndex].currentTime;
        audioElements[otherIndex].pause();
    }

    // Ensure savedTime doesn't exceed the duration of the new track
    const audio = audioElements[index];
    if (audio) {
        // Wait until the audio metadata is loaded
        if (audio.readyState >= 1) {
            setCurrentTimeAndPlay(audio);
        } else {
            audio.addEventListener('loadedmetadata', () => {
                setCurrentTimeAndPlay(audio);
            });
        }
    }
}

function setCurrentTimeAndPlay(audio) {
    // Adjust savedTime if it exceeds the audio duration
    if (savedTime > audio.duration) {
        savedTime = audio.duration;
    }

    audio.currentTime = savedTime;
    audio.play();
    if (!isVisualizing) {
        isVisualizing = true;
        visualize();
    }
}

// Play and Stop functions
function playCurrentTrack() {
    const audio = audioElements[currentTrackIndex];
    if (audio) {
        audio.play();
        if (!isVisualizing) {
            isVisualizing = true;
            visualize();
        }
    }
}

function stopCurrentTrack() {
    const audio = audioElements[currentTrackIndex];
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        isVisualizing = false;
        clearCanvas();
    }
}

// Event listeners for Play and Stop buttons
playButton.addEventListener('click', playCurrentTrack);
stopButton.addEventListener('click', stopCurrentTrack);

// Switch between tracks
switchButton.addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex + 1) % 2;
    playTrack(currentTrackIndex);
});

// Visualization function
function visualize() {
    if (!isVisualizing) return;

    requestAnimationFrame(visualize);

    if (!analyser) return;

    // Clear the canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Get audio data
    analyser.getByteFrequencyData(dataArray);
    analyser.getByteTimeDomainData(timeDomainArray);

    // Draw frequency bars
    drawFrequencyBars();

    // Additional visualizations for the second track
    if (currentTrackIndex === 1) {
        draw3DWaveformRibbon();
        drawBlueTurquoiseParticlesSphere();
    }
}

function drawFrequencyBars() {
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i];

        if (currentTrackIndex === 0) {
            // Black and white bars for the first track
            const gray = barHeight; // Value between 0 and 255
            canvasCtx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
        } else {
            // Blue and turquoise hues for the second track
            const hue = 180 + (i / bufferLength) * 30; // Hue from 180 to 210 (blue to turquoise)
            canvasCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        }

        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
}

// Function to draw a 3D-like waveform ribbon
function draw3DWaveformRibbon() {
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    canvasCtx.save();

    // Create gradient for 3D effect
    const gradient = canvasCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 128, 255, 0.4)');

    canvasCtx.fillStyle = gradient;

    canvasCtx.beginPath();
    canvasCtx.moveTo(0, centerY);

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const v = timeDomainArray[i] / 128.0;
        const y = v * centerY;

        canvasCtx.lineTo(x, y);

        x += sliceWidth;
    }

    canvasCtx.lineTo(width, centerY);
    canvasCtx.closePath();
    canvasCtx.fill();

    canvasCtx.restore();
}

// Function to draw a prominent rotating particles sphere in blue to turquoise hues
let sphereAngle = 0;
function drawBlueTurquoiseParticlesSphere() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) * 1.5; // Increase the size of the sphere

    sphereAngle += 0.005; // Adjust rotation speed as desired

    for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const percent = value / 255;

        const angle = ((i / bufferLength) * Math.PI * 2) + sphereAngle;
        const radius = percent * maxRadius;

        // Simulate 3D depth
        const depth = Math.cos(angle + sphereAngle);
        const size = 20 + 40 * percent; // Increase the size based on audio data

        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle); // No vertical compression

        // Blue to turquoise hues
        const hue = 180 + (percent * 30); // Hue from 180 to 210 degrees
        const saturation = 100;
        const lightness = 50 + (depth * 10); // Adjust lightness for depth

        canvasCtx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)`;

        canvasCtx.beginPath();
        canvasCtx.arc(x, y, size, 0, 2 * Math.PI);
        canvasCtx.fill();
    }
}

// Function to clear the canvas
function clearCanvas() {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
}
