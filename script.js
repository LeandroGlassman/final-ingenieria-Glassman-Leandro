// Global state variables
let allCountries = [];
let currentCountry = null;
let nextCountry = null;
let score = 0;
let highScore = 0;
let isAnimating = false;

// Audio context for sound effects (initialized on first user interaction)
let audioContext = null;

// Initialize audio context on first user interaction
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Resume context if suspended (required for iOS/Safari)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
}

// DOM Elements
const loadingScreen = document.getElementById('loading');
const errorScreen = document.getElementById('error');
const gameArea = document.getElementById('game-area');
const gameOverModal = document.getElementById('game-over');

const currentScoreEl = document.getElementById('current-score');
const highScoreEl = document.getElementById('high-score');

const currentFlagEl = document.getElementById('current-flag');
const currentNameEl = document.getElementById('current-name');
const currentPopulationEl = document.getElementById('current-population');

const nextFlagEl = document.getElementById('next-flag');
const nextNameEl = document.getElementById('next-name');
const nextPopulationEl = document.getElementById('next-population');
const populationPlaceholderEl = document.getElementById('population-placeholder');

const higherBtn = document.getElementById('higher-btn');
const lowerBtn = document.getElementById('lower-btn');
const restartBtn = document.getElementById('restart-btn');
const retryBtn = document.getElementById('retry-btn');

const finalScoreEl = document.getElementById('final-score');
const modalHighScoreEl = document.getElementById('modal-high-score');
const newHighScoreEl = document.getElementById('new-high-score');

const nextCard = document.getElementById('next-card');

// API Integration
async function fetchCountries() {
    try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,population,flags');

        if (!response.ok) {
            throw new Error('Failed to fetch countries');
        }

        const data = await response.json();

        // Filter countries with population >= 100,000
        allCountries = data.filter(country => country.population >= 100000);

        if (allCountries.length === 0) {
            throw new Error('No countries found with sufficient population');
        }

        return true;
    } catch (error) {
        console.error('Error fetching countries:', error);
        return false;
    }
}

// Game Initialization
async function initGame() {
    // Load high score from localStorage
    const savedHighScore = localStorage.getItem('highScore');
    highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;
    highScoreEl.textContent = highScore;

    // Fetch countries
    const success = await fetchCountries();

    if (success) {
        loadingScreen.classList.add('hidden');
        startNewGame();
    } else {
        loadingScreen.classList.add('hidden');
        errorScreen.classList.remove('hidden');
    }
}

function startNewGame() {
    score = 0;
    isAnimating = false;

    // Hide game over modal, show game area
    gameOverModal.classList.add('hidden');
    gameArea.classList.remove('hidden');

    // Pick two random countries
    currentCountry = selectRandomCountry();
    nextCountry = selectRandomCountry(currentCountry);

    // Render cards
    renderCountryCard(currentCountry, 'current', true);
    renderCountryCard(nextCountry, 'next', false);

    // Update score display
    updateScoreDisplay();

    // Enable buttons
    enableButtons();
}

// Game Logic
function selectRandomCountry(excludeCountry = null) {
    let country;
    do {
        const randomIndex = Math.floor(Math.random() * allCountries.length);
        country = allCountries[randomIndex];
    } while (excludeCountry && country.name.common === excludeCountry.name.common);

    return country;
}

async function handleGuess(guess) {
    if (isAnimating) return;

    // Disable buttons and set animating flag
    isAnimating = true;
    disableButtons();

    // Determine if guess is correct
    const isCorrect = (guess === 'higher' && nextCountry.population > currentCountry.population) ||
                     (guess === 'lower' && nextCountry.population < currentCountry.population);

    // Animation sequence
    await revealPopulation(isCorrect);

    if (isCorrect) {
        // Increment score
        score++;
        updateScoreDisplay();

        // Wait a moment for player to see the result
        await sleep(500);

        // Move next country to current position
        currentCountry = nextCountry;
        nextCountry = selectRandomCountry(currentCountry);

        // Update UI
        renderCountryCard(currentCountry, 'current', true);
        renderCountryCard(nextCountry, 'next', false);

        // Re-enable buttons
        isAnimating = false;
        enableButtons();
    } else {
        // Wait a moment, then show game over
        await sleep(500);
        gameOver();
    }
}

async function revealPopulation(isCorrect) {
    // Wait for suspense
    await sleep(300);

    // Hide placeholder, show population with animation
    nextPopulationEl.textContent = formatPopulation(nextCountry.population);
    populationPlaceholderEl.classList.add('hidden');
    nextPopulationEl.classList.remove('hidden');
    nextPopulationEl.classList.add('fade-in');

    // Flash card color and play sound
    if (isCorrect) {
        nextCard.classList.add('correct');
        playCorrectSound();
    } else {
        nextCard.classList.add('incorrect');
        playIncorrectSound();
    }

    // Wait for animation
    await sleep(400);

    // Remove animation classes
    nextCard.classList.remove('correct', 'incorrect');
    nextPopulationEl.classList.remove('fade-in');
}

function gameOver() {
    // Check for new high score
    const isNewHighScore = score > highScore;

    if (isNewHighScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore.toString());
        highScoreEl.textContent = highScore;
        newHighScoreEl.classList.remove('hidden');
    } else {
        newHighScoreEl.classList.add('hidden');
    }

    // Update modal content
    finalScoreEl.textContent = score;
    modalHighScoreEl.textContent = highScore;

    // Hide game area, show modal
    gameArea.classList.add('hidden');
    gameOverModal.classList.remove('hidden');
}

function restartGame() {
    startNewGame();
}

// UI Rendering
function renderCountryCard(country, cardType, showPopulation) {
    if (cardType === 'current') {
        currentFlagEl.src = country.flags.png;
        currentFlagEl.alt = `${country.name.common} flag`;
        currentNameEl.textContent = country.name.common;
        currentPopulationEl.textContent = formatPopulation(country.population);
    } else {
        nextFlagEl.src = country.flags.png;
        nextFlagEl.alt = `${country.name.common} flag`;
        nextNameEl.textContent = country.name.common;

        if (showPopulation) {
            nextPopulationEl.textContent = formatPopulation(country.population);
            nextPopulationEl.classList.remove('hidden');
            populationPlaceholderEl.classList.add('hidden');
        } else {
            nextPopulationEl.classList.add('hidden');
            populationPlaceholderEl.classList.remove('hidden');
        }
    }
}

function formatPopulation(number) {
    return number.toLocaleString();
}

function updateScoreDisplay() {
    currentScoreEl.textContent = score;
}

function enableButtons() {
    higherBtn.disabled = false;
    lowerBtn.disabled = false;
}

function disableButtons() {
    higherBtn.disabled = true;
    lowerBtn.disabled = true;
}

// Utility function for delays
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Sound Effects
function playCorrectSound() {
    if (!audioContext) return;

    try {
        // Resume audio context if suspended (iOS/Safari)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Pleasant ascending tone
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.log('Sound playback failed:', error);
    }
}

function playIncorrectSound() {
    if (!audioContext) return;

    try {
        // Resume audio context if suspended (iOS/Safari)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Descending tone for incorrect
        oscillator.frequency.setValueAtTime(392.00, audioContext.currentTime); // G4
        oscillator.frequency.setValueAtTime(261.63, audioContext.currentTime + 0.15); // C4

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
        console.log('Sound playback failed:', error);
    }
}

// Event Listeners
higherBtn.addEventListener('click', () => {
    initAudioContext();
    handleGuess('higher');
});
lowerBtn.addEventListener('click', () => {
    initAudioContext();
    handleGuess('lower');
});
restartBtn.addEventListener('click', () => {
    initAudioContext();
    restartGame();
});
retryBtn.addEventListener('click', () => {
    initAudioContext();
    errorScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    initGame();
});

// Initialize audio on any touch/click (for mobile browsers)
document.addEventListener('touchstart', initAudioContext, { once: true });
document.addEventListener('click', initAudioContext, { once: true });

// Initialize game on page load
window.addEventListener('load', initGame);
