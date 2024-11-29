//    _______
//   |A      |                Poker Timer
//   |       |
//   |   ♠   |    Author: καsн
//   |       |    URL   : https://github.com/k44sh/poker
//   |      A|
//    ‾‾‾‾‾‾‾

// Globals
let levels = [];
let currentLevel = 0;
let timeRemaining = 0;
let paused = true;
let interval = null;
let gameStartTime = 0;
let nextBreakTime = null;
let settingsModal = null;
let sortableInstance = null;
let gameStarted = false;
let translations = {};
let userLang = 'en';
let stack = null;
let buyIn = null;
let bounty = null;
let rebuyUntilLevel = null;

// =========================
// Internationalization (i18n)
// =========================

// Function to detect user's language and load the appropriate translation file
async function loadTranslations() {
    const preferredLanguages = navigator.languages;
    const supportedLanguages = ['en', 'fr', 'es', 'zh', 'ar', 'ru', 'pt', 'hi', 'it', 'nl', 'jp', 'de'];

    userLang = preferredLanguages.find(lang => supportedLanguages.includes(lang.substring(0, 2))) || 'en';
    userLang = userLang.substring(0, 2);

    const translationFile = `./lang/${userLang}.json`;

    try {
        const response = await fetch(translationFile);
        if (!response.ok) {
            throw new Error(`Failed to load translation file: ${translationFile}`);
        }
        translations = await response.json();
        console.log(`Loaded translations for language: ${userLang}`);
    } catch (error) {
        console.error("Error loading translations:", error);
        alert("Failed to load translations. The application will use the default language.");
        translations = {};
    }

    if (['ar', 'he', 'fa', 'ur'].includes(userLang)) {
        document.documentElement.setAttribute('dir', 'rtl');
    } else {
        document.documentElement.setAttribute('dir', 'ltr');
    }
}

// Function to get the translated text for a given key
function t(key) {
    return translations[key] || key;
}

// Function to apply translations to static elements
function applyTranslations() {
    document.title = t('appTitle');
    const elements = {
        'infosTitle': t('infos'),
        'stackLabel': t('startingStack') + ' :',
        'buyInLabel': t('buyIn') + ' :',
        'bountyLabel': t('bounty') + ' :',
        'rebuyUntilLabel': t('rebuyUntilLevel') + ' :',
        'levelsTitle': t('levels'),
        'headerLevel': t('level'),
        'headerSmallBlind': t('smallBlind'),
        'headerBigBlind': t('bigBlind'),
        'headerAnte': t('ante'),
        'headerDuration': `${t('duration')} (${t('minutes')})`,
        'nextBlindsLabel': `${t('nextBlinds')} :`,
        'nextAnteLabel': `${t('nextAnte')} :`,
        'nextBreakLabel': `${t('nextBreakIn')} :`,
        'totalGameDurationLabel': `${t('totalGameDuration')} :`,
        'nextButton': t('next'),
        'previousButton': t('previous'),
        'resetButton': t('reset'),
        'settingsButton': t('settings'),
        'controlButton': gameStarted ? (paused ? t('resume') : t('pause')) : t('start'),
        'settingsTitle': t('gameSettings'),
        'addLevelButton': t('addLevel'),
        'addBreakButton': t('addBreak'),
        'resetLevelsButton': t('resetLevels'),
        'closeButton': t('close'),
        'stackInputLabel': t('startingStack'),
        'buyInInputLabel': t('buyIn'),
        'bountyInputLabel': t('bounty'),
        'rebuyUntilInputLabel': t('rebuyUntilLevel')
    };

    for (const id in elements) {
        const element = document.getElementById(id);
        if (element) {
            element.innerText = elements[id];
        } else {
            console.warn(`Element with id '${id}' not found for translation.`);
        }
    }
}

// ===========================
// 1. Levels Loading and Setup
// ===========================

// Load levels and game info from the configuration file with a promise
function loadConfig() {
    return new Promise((resolve, reject) => {
        fetch('./config.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(config => {
                if (!Array.isArray(config.levels)) {
                    throw new Error("Config 'levels' is not an array.");
                }
                console.log("Config successfully loaded (Default)");
                stack = config.stack || 5000;
                buyIn = config.buyIn || 20;
                bounty = config.bounty || 5;
                rebuyUntilLevel = config.rebuyUntilLevel || 4;
                resolve(config);
            })
            .catch(error => {
                console.error("Error loading config.json:", error);
                alert("Failed to load configuration. Please check your config.json file.");
                reject(error);
            });
    });
}

// Function to reset levels from config.json
async function resetLevels() {
    try {
        console.log("Resetting levels...");
        const config = await loadConfig();
        if (!config || !Array.isArray(config.levels)) {
            throw new Error("Invalid configuration format.");
        }
        levels = config.levels || [];
        renderLevelsInSettings();
        updateDisplay();
        saveState();
        console.log("Levels have been reset successfully.");
    } catch (error) {
        console.error("Error resetting levels: ", error);
        alert(t('errorReloadingSettings'));
    }
}

// Main initialization function
async function initializePokerTimer() {
    try {
        console.log(`
            _______
           |A      |                Poker Timer
           |       |
           |   ♠   |    Author: καsн
           |       |    URL   : https://github.com/k44sh/poker
           |      A|
            ‾‾‾‾‾‾‾\n\n`);
        console.log("Initializing Poker Timer...");
        const config = await loadConfig();
        if (!config || !Array.isArray(config.levels)) {
            throw new Error("Invalid configuration format.");
        }

        const stateLoaded = loadState(config.levels);
        if (!stateLoaded) {
            levels = config.levels || [];
            resetGame(true);
        } else {
            renderLevelsInSettings();
            updateDisplay();
        }

        console.log("Poker Timer initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize Poker Timer:", error);
    }
}

// Reset the game to the initial state
function resetGame(force = false) {
    if (!force) {
        const userConfirmed = confirm(t('confirmReset'));
        if (!userConfirmed) {
            console.log("Reset canceled by user.");
            return;
        }
    }

    clearInterval(interval);
    currentLevel = 0;
    if (!levels[currentLevel]) {
        console.error("No levels available to start the game.");
        return;
    }
    timeRemaining = levels[currentLevel]?.duration || 0;
    gameStartTime = 0;
    paused = true;
    gameStarted = false;
    adjustCurrentLevel();
    const controlButton = document.getElementById('controlButton');
    if (controlButton) {
        controlButton.innerText = t('start');
        controlButton.classList.remove('app-btn-pause');
        controlButton.classList.add('app-btn-start');
    } else {
        console.error("Control button not found in the DOM.");
    }
    stack = stack || 5000;
    buyIn = buyIn || 20;
    bounty = bounty || 5;
    rebuyUntilLevel = rebuyUntilLevel || 4;
    updateDisplay();
    saveState();
    console.log("Game has been reset to initial state.");
}

// Adjust current level and calculate timing
function adjustCurrentLevel(resetTime = true) {
    if (!levels[currentLevel]) {
        console.warn("Current level not found. Adjusting to last level.");
        currentLevel = levels.length - 1;
    }
    if (resetTime) {
        timeRemaining = levels[currentLevel]?.duration || 0;
    }
    nextBreakTime = calculateNextBreakTime();
}

// Add a new game level
function addLevel() {
    levels.push({
        smallBlind: 1,
        bigBlind: 2,
        ante: 0,
        duration: 1200
    });
    renderLevelsInSettings();
    updateDisplay();
    saveState();
    console.log("New level added.");
}

// Add a break to the game
function addBreak() {
    levels.push({
        duration: 900,
        isBreak: true
    });
    nextBreakTime = calculateNextBreakTime();
    renderLevelsInSettings();
    updateDisplay();
    saveState();
    console.log("New break added.");
}

// Remove a level or break by index
function removeLevel(index) {
    if (index < 0 || index >= levels.length) {
        console.error(`Invalid index ${index} for removing level.`);
        return;
    }
    levels.splice(index, 1);
    if (index < currentLevel) currentLevel--;
    adjustCurrentLevel();
    renderLevelsInSettings();
    updateDisplay();
    saveState();
    console.log(`Level at index ${index} removed.`);
}

// Update a specific level's field
function updateLevel(index, field, value) {
    if (index < 0 || index >= levels.length) {
        console.error(`Invalid index ${index} for updating level.`);
        return;
    }
    if (!levels[index]) {
        console.error(`Level at index ${index} does not exist.`);
        return;
    }
    const validFields = ['smallBlind', 'bigBlind', 'ante', 'duration'];
    if (!validFields.includes(field)) {
        console.error(`Invalid field '${field}' for updating level.`);
        return;
    }
    value = parseInt(value) || 0;
    if (field === 'duration') {
        levels[index][field] = value > 0 ? value * 60 : 0;
    } else {
        levels[index][field] = Math.max(0, value);
    }
    if (index === currentLevel) adjustCurrentLevel();
    renderLevelsInSettings();
    updateDisplay();
    saveState();
    console.log(`Level ${index} updated: ${field} set to ${value}.`);
}

// Function to update game info (stack, buy-in, bounty, rebuy level)
function updateGameInfo(field, value) {
    value = parseInt(value) || 0;
    if (field === 'stack') {
        stack = Math.max(0, value);
    } else if (field === 'buyIn') {
        buyIn = Math.max(0, value);
    } else if (field === 'bounty') {
        bounty = Math.max(0, value);
    } else if (field === 'rebuyUntilLevel') {
        rebuyUntilLevel = Math.max(0, value);
    }
    updateGameInfoDisplay();
    saveState();
}

// =========================
// 2. Timer and Game Control
// =========================

// Unified control function for starting, pausing, and resuming the game
function controlGame() {
    if (!gameStarted) {
        gameStarted = true;
        paused = false;
        startTimer();
        console.log("Game started.");
    } else {
        paused = !paused;
        if (paused) {
            clearInterval(interval);
            console.log("Game paused.");
        } else {
            startTimer();
            console.log("Game resumed.");
        }
    }
    updateDisplay();
}

// Start the game timer
function startTimer() {
    if (!levels.length || !levels[currentLevel]) {
        console.error("No levels available to start the timer.");
        return;
    }

    if (interval) {
        clearInterval(interval);
    }

    interval = setInterval(() => {
        if (!paused) {
            if (levels[currentLevel]?.duration === 0) {
                gameStartTime++;
                updateDisplay();
            } else if (timeRemaining > 0) {
                timeRemaining--;
                gameStartTime++;
                if (nextBreakTime !== null) nextBreakTime--;
                updateDisplay();
            } else {
                nextLevel();
            }
            saveState();
        }
    }, 1000);
}

// Move to the next level
function nextLevel() {
    if (currentLevel + 1 < levels.length) {
        currentLevel++;
        adjustCurrentLevel();
        playLevelUpSound();
        updateDisplay();
        clearInterval(interval);
        if (!paused) startTimer();
        console.log(`Moved to next level: ${currentLevel}`);
    } else {
        endGame();
    }
}

// Move to the previous level
function previousLevel() {
    if (currentLevel > 0) {
        currentLevel--;
        adjustCurrentLevel();
        updateDisplay();
        clearInterval(interval);
        if (!paused) startTimer();
        console.log(`Moved to previous level: ${currentLevel}`);
    } else {
        console.warn("Already at the first level.");
    }
}

// End the game
function endGame() {
    alert(t('gameOver'));
    clearInterval(interval);
    timeRemaining = 0;
    paused = true;
    gameStarted = false;
    const controlButton = document.getElementById('controlButton');
    if (controlButton) {
        controlButton.innerText = t('start');
        controlButton.classList.remove('app-btn-pause');
        controlButton.classList.add('app-btn-start');
    } else {
        console.error("Control button not found in the DOM.");
    }
    updateDisplay();
    saveState();
    console.log("Game ended.");
}

// Play the level-up sound
function playLevelUpSound() {
    const levelUpSound = document.getElementById('levelUpSound');
    if (levelUpSound) {
        levelUpSound.play().catch(error => {
            console.error("Error playing level-up sound:", error);
        });
    } else {
        console.error("Level-up sound element not found in the DOM.");
    }
    console.log("Level-up sound played.");
}

// ===================
// 3. Display and UI
// ===================

function updateDisplay() {
    const dataSection = document.querySelector('.data');
    const timerSection = document.querySelector('.timer');
    const chipsSection = document.querySelector('.chips');
    const time = document.getElementById('time');
    const level = document.getElementById('level');
    const anteChip = document.querySelector('.chip.small');
    const nextAnteContainer = document.getElementById('nextAnteContainer');
    const nextBlindsContainer = document.getElementById('nextBlindsContainer');
    const nextBreakContainer = document.getElementById('nextBreakContainer');
    const progressBarContainer = document.querySelector('.progress-bar');
    const progressBar = document.getElementById('progress');

    if (!dataSection || !timerSection || !chipsSection || !time || !level || !progressBarContainer || !progressBar) {
        console.error("One or more DOM elements not found for updating display.");
        return;
    }

    if (!levels.length || !levels[currentLevel]) {
        time.innerText = "--:--";
        const smallBlindElem = document.getElementById('smallBlind');
        const bigBlindElem = document.getElementById('bigBlind');
        const anteElem = document.getElementById('ante');
        if (smallBlindElem) smallBlindElem.innerText = '--';
        if (bigBlindElem) bigBlindElem.innerText = '--';
        if (anteElem) anteElem.innerText = '--';
        progressBar.style.width = '0%';
        progressBarContainer.style.display = 'none';
        if (nextBreakContainer) nextBreakContainer.style.display = 'none';
        if (nextBlindsContainer) nextBlindsContainer.style.display = 'none';
        if (nextAnteContainer) nextAnteContainer.style.display = 'none';
        chipsSection.classList.add('d-none');
        dataSection.classList.add('hidden');
        timerSection.classList.add('full-width');
        return;
    }

    if (levels[currentLevel]?.duration === 0 || timeRemaining === 0) {
        dataSection.classList.add('hidden');
        timerSection.classList.add('full-width');
    } else {
        dataSection.classList.remove('hidden');
        timerSection.classList.remove('full-width');
    }

    const currentLevelConfig = levels[currentLevel];

    if (currentLevelConfig.isBreak) {
        level.innerText = t('break');
        time.innerText = currentLevelConfig.duration === 0 ? t('infinite') : formatTime(timeRemaining);
        if (document.getElementById('smallBlind')) document.getElementById('smallBlind').innerText = '';
        if (document.getElementById('bigBlind')) document.getElementById('bigBlind').innerText = '';
        if (document.getElementById('ante')) document.getElementById('ante').innerText = '';
        if (nextBlindsContainer) nextBlindsContainer.style.display = 'none';
        if (nextBreakContainer) nextBreakContainer.style.display = 'none';
        if (nextAnteContainer) nextAnteContainer.style.display = 'none';
        timerSection.classList.add('break-mode');
        time.classList.add('break-mode');
        chipsSection.classList.add('d-none');
        progressBarContainer.style.display = 'none';
    } else {
        level.innerText = `${t('level')} ${getLevelNumber(currentLevel)}`;
        time.innerText = currentLevelConfig.duration === 0 ? t('infinite') : formatTime(timeRemaining);
        if (document.getElementById('smallBlind')) {
            document.getElementById('smallBlind').innerText =
                currentLevelConfig.smallBlind > 0 ? currentLevelConfig.smallBlind : '--';
        }
        if (document.getElementById('bigBlind')) {
            document.getElementById('bigBlind').innerText =
                currentLevelConfig.bigBlind > 0 ? currentLevelConfig.bigBlind : '--';
        }

        if (currentLevelConfig.ante >= 0) {
            if (document.getElementById('ante')) {
                document.getElementById('ante').innerText = currentLevelConfig.ante ?? '--';
            }
            if (anteChip) {
                anteChip.style.display = currentLevelConfig.ante > 0 ? 'block' : 'none';
            }
        } else {
            if (document.getElementById('ante')) {
                document.getElementById('ante').innerText = '--';
            }
            if (anteChip) {
                anteChip.style.display = 'none';
            }
        }

        if (currentLevelConfig.duration === 0 && nextAnteContainer) {
            nextAnteContainer.style.display = 'none';
        }

        timerSection.classList.remove('break-mode');
        time.classList.remove('break-mode');
        chipsSection.classList.remove('d-none');

        if (currentLevelConfig.duration === 0) {
            progressBarContainer.style.display = 'none';
        } else {
            progressBarContainer.style.display = 'block';
            progressBar.style.width = ((levels[currentLevel].duration - timeRemaining) / levels[currentLevel].duration) * 100 + '%';
        }
    }

    // Next blinds and antes
    const nextLevelIndex = getNextNonBreakLevelIndex(currentLevel);
    const nextLevel = nextLevelIndex !== null ? levels[nextLevelIndex] : null;

    if (currentLevelConfig.duration === 0) {
        if (nextBlindsContainer) nextBlindsContainer.style.display = 'none';
        if (nextBreakContainer) nextBreakContainer.style.display = 'none';
        if (nextAnteContainer) nextAnteContainer.style.display = 'none';
    } else {
        if (nextLevel) {
            if (document.getElementById('nextSmallBlind')) {
                document.getElementById('nextSmallBlind').innerText =
                    nextLevel.smallBlind > 0 ? nextLevel.smallBlind : '--';
            }
            if (document.getElementById('nextBigBlind')) {
                document.getElementById('nextBigBlind').innerText =
                    nextLevel.bigBlind > 0 ? nextLevel.bigBlind : '--';
            }

            if (nextLevel.ante >= 0) {
                if (document.getElementById('nextAnte')) {
                    document.getElementById('nextAnte').innerText = nextLevel.ante ?? '--';
                }
                if (nextAnteContainer) {
                    nextAnteContainer.style.display =
                        nextLevel.ante > 0 ? 'block' : 'none';
                }
            } else if (nextAnteContainer) {
                nextAnteContainer.style.display = 'none';
            }

            if (nextBlindsContainer) nextBlindsContainer.style.display = 'block';
        } else {
            if (nextBlindsContainer) nextBlindsContainer.style.display = 'none';
            if (nextAnteContainer) nextAnteContainer.style.display = 'none';
        }

        // Next break
        if (nextBreakTime !== null && !isNaN(nextBreakTime) && nextBreakTime > 0) {
            const minutes = Math.floor(nextBreakTime / 60);
            const seconds = nextBreakTime % 60;
            if (document.getElementById('nextBreak')) {
                document.getElementById('nextBreak').innerText =
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            if (nextBreakContainer) nextBreakContainer.style.display = 'block';
        } else if (nextBreakContainer) {
            nextBreakContainer.style.display = 'none';
        }
    }

    updateTotalGameDuration();
    renderLevelsTable();
    updateGameInfoDisplay();

    // Update the control button text and style based on the game state
    const controlButton = document.getElementById('controlButton');
    if (controlButton) {
        if (!gameStarted) {
            controlButton.innerText = t('start');
            controlButton.classList.remove('app-btn-pause');
            controlButton.classList.add('app-btn-start');
        } else {
            controlButton.innerText = paused ? t('resume') : t('pause');
            controlButton.classList.remove('app-btn-start');
            controlButton.classList.add('app-btn-pause');
        }
    } else {
        console.error("Control button not found in the DOM.");
    }
}

// Update the game info display
function updateGameInfoDisplay() {
    // Update Infos section
    const stackValueElem = document.getElementById('stackValue');
    const buyInValueElem = document.getElementById('buyInValue');
    const bountyValueElem = document.getElementById('bountyValue');
    const rebuyUntilValueElem = document.getElementById('rebuyUntilValue');

    if (stackValueElem) stackValueElem.innerText = stack;
    if (buyInValueElem) buyInValueElem.innerText = buyIn;
    if (bountyValueElem) bountyValueElem.innerText = bounty;
    if (rebuyUntilValueElem) rebuyUntilValueElem.innerText = rebuyUntilLevel;

    // Update inputs in settings modal
    const stackInput = document.getElementById('stackInput');
    const buyInInput = document.getElementById('buyInInput');
    const bountyInput = document.getElementById('bountyInput');
    const rebuyUntilInput = document.getElementById('rebuyUntilInput');

    if (stackInput) stackInput.value = stack;
    if (buyInInput) buyInInput.value = buyIn;
    if (bountyInput) bountyInput.value = bounty;
    if (rebuyUntilInput) rebuyUntilInput.value = rebuyUntilLevel;
}

// Update the total game duration display
function updateTotalGameDuration() {
    const minutes = Math.floor(gameStartTime / 60);
    const seconds = gameStartTime % 60;
    const totalGameDurationElem = document.getElementById('totalGameDuration');
    if (totalGameDurationElem) {
        totalGameDurationElem.innerText =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        console.error("Total game duration element not found in the DOM.");
    }
}

// Format time in mm:ss
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        console.error(`Invalid seconds value: ${seconds}`);
        return "--:--";
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Get the current level number (excluding breaks)
function getLevelNumber(index) {
    let levelNumber = 0;
    for (let i = 0; i <= index; i++) {
        if (levels[i] && !levels[i].isBreak) {
            levelNumber++;
        }
    }
    return levelNumber;
}

// Get the index of the next non-break level
function getNextNonBreakLevelIndex(currentIndex) {
    for (let i = currentIndex + 1; i < levels.length; i++) {
        if (levels[i] && !levels[i].isBreak) {
            return i;
        }
    }
    return null;
}

// Calculate time until the next break
function calculateNextBreakTime() {
    if (!levels.length || currentLevel >= levels.length) {
        console.warn("No levels available or current level exceeds levels length.");
        return null;
    }

    let timeUntilNextBreak = timeRemaining;

    for (let i = currentLevel + 1; i < levels.length; i++) {
        const level = levels[i];

        if (level.isBreak) {
            return timeUntilNextBreak;
        }

        timeUntilNextBreak += level.duration || 0;
    }

    return null;
}

// Render the levels table
function renderLevelsTable() {
    const levelsBody = document.getElementById('levelsBody');
    if (!levelsBody) {
        console.error("Levels table body element not found in the DOM.");
        return;
    }
    levelsBody.innerHTML = '';

    let levelNumber = 1;

    levels.forEach((level) => {
        const row = document.createElement('tr');

        if (level.isBreak) {
            row.classList.add('break');
            row.innerHTML = `
                <td colspan="5">${t('break')} - ${level.duration === 0 ? t('infinite') : level.duration / 60 + " " + t('minutes')}</td>
            `;
        } else {
            row.innerHTML = `
                <td>${levelNumber++}</td>
                <td>${level.smallBlind}</td>
                <td>${level.bigBlind}</td>
                <td>${level.ante ?? 0}</td>
                <td>${level.duration === 0 ? t('infinite') : level.duration / 60}</td>
            `;
        }

        levelsBody.appendChild(row);
    });
}

// ========================
// 4. Settings and Modal UI
// ========================

// Open the settings modal
function openSettings() {
    const settingsElem = document.getElementById('settings');
    if (!settingsElem) {
        console.error("Settings modal element not found in the DOM.");
        return;
    }
    if (!settingsModal) settingsModal = new bootstrap.Modal(settingsElem);
    settingsModal.show();
    renderLevelsInSettings();
}

// Close the settings modal
function closeSettings() {
    if (settingsModal) {
        settingsModal.hide();
    }
    adjustCurrentLevel();
    updateDisplay();
}

// Render the levels in the settings modal
function renderLevelsInSettings() {
    const levelsContainer = document.getElementById('levelsContainer');
    if (!levelsContainer) {
        console.error("Levels container element not found in the DOM.");
        return;
    }
    levelsContainer.innerHTML = '';

    const headers = document.createElement('div');
    headers.className = 'level-headers d-flex align-items-center mb-2';
    headers.innerHTML = `
        <span class="drag-handle"></span>
        <div class="header-type">${t('type')}</div>
        <div class="header-smallBlind">${t('smallBlind')}</div>
        <div class="header-bigBlind">${t('bigBlind')}</div>
        <div class="header-ante">${t('ante')}</div>
        <div class="header-duration">${t('duration')} (${t('minutes')})</div>
        <div class="header-action"></div>
    `;
    levelsContainer.appendChild(headers);

    let levelCount = 1;
    levels.forEach((level, index) => {
        const row = document.createElement('div');
        row.className = `level-row mb-2 d-flex align-items-center ${level.isBreak ? 'break' : ''}`;

        if (level.isBreak) {
            row.innerHTML = `
                <span class="drag-handle">☰</span>
                <div class="level-type">${t('break')}</div>
                <div class="header-smallBlind"></div>
                <div class="header-bigBlind"></div>
                <div class="header-ante"></div>
                <input type="number" class="form-control" style="width: 100px;" value="${level.duration / 60}" 
                    onchange="updateLevel(${index}, 'duration', this.value)" placeholder="${t('duration')} (${t('minutes')})">
                <button class="btn btn-danger btn-sm" onclick="removeLevel(${index})">${t('remove')}</button>
            `;
        } else {
            row.innerHTML = `
                <span class="drag-handle">☰</span>
                <div class="level-type">${t('level')} ${levelCount++}</div>
                <input type="number" class="form-control" style="width: 100px;" value="${level.smallBlind}" 
                    onchange="updateLevel(${index}, 'smallBlind', this.value)" placeholder="${t('smallBlind')}">
                <input type="number" class="form-control" style="width: 100px;" value="${level.bigBlind}" 
                    onchange="updateLevel(${index}, 'bigBlind', this.value)" placeholder="${t('bigBlind')}">
                <input type="number" class="form-control" style="width: 100px;" value="${level.ante}" 
                    onchange="updateLevel(${index}, 'ante', this.value)" placeholder="${t('ante')}">
                <input type="number" class="form-control" style="width: 100px;" value="${level.duration / 60}" 
                    onchange="updateLevel(${index}, 'duration', this.value)" placeholder="${t('duration')} (${t('minutes')})">
                <button class="btn btn-danger btn-sm" onclick="removeLevel(${index})">${t('remove')}</button>
            `;
        }

        levelsContainer.appendChild(row);
    });

    // Initialize sortable for drag and drop
    if (sortableInstance) {
        sortableInstance.destroy();
    }

    if (typeof Sortable === 'undefined') {
        console.error("Sortable.js is not loaded.");
        return;
    }

    sortableInstance = new Sortable(levelsContainer, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: function (evt) {
            const oldIndex = evt.oldIndex - 1;
            const newIndex = evt.newIndex - 1;

            if (oldIndex < 0 || oldIndex >= levels.length || newIndex < 0 || newIndex >= levels.length) {
                console.error("Invalid indices for sorting levels.");
                return;
            }

            const movedItem = levels.splice(oldIndex, 1)[0];
            levels.splice(newIndex, 0, movedItem);

            renderLevelsInSettings();
            updateDisplay();
            saveState();
            console.log(`Levels reordered: moved from ${oldIndex} to ${newIndex}.`);
        }
    });
}

// =========================
// 5. State Persistence
// =========================

// Function to save the current state to localStorage
function saveState() {
    try {
        const state = {
            levels: levels,
            currentLevel: currentLevel,
            timeRemaining: timeRemaining,
            gameStartTime: gameStartTime,
            paused: paused,
            gameStarted: gameStarted,
            stack: stack,
            buyIn: buyIn,
            bounty: bounty,
            rebuyUntilLevel: rebuyUntilLevel
        };
        localStorage.setItem('pokerTimerState', JSON.stringify(state));
        console.log("State saved to localStorage.");
    } catch (error) {
        console.error("Error saving state:", error);
    }
}

// Function to load the state from localStorage
function loadState(defaultLevels) {
    try {
        const stateJSON = localStorage.getItem('pokerTimerState');
        if (stateJSON) {
            const state = JSON.parse(stateJSON);
            levels = state.levels && state.levels.length > 0 ? state.levels : defaultLevels;
            currentLevel = state.currentLevel || 0;
            timeRemaining = state.timeRemaining !== undefined ? state.timeRemaining : levels[currentLevel]?.duration || 0;
            gameStartTime = state.gameStartTime || 0;
            gameStarted = state.gameStarted || false;
            paused = true;
            nextBreakTime = calculateNextBreakTime();
            stack = state.stack || 5000;
            buyIn = state.buyIn || 20;
            bounty = state.bounty || 5;
            rebuyUntilLevel = state.rebuyUntilLevel || 4;
            console.log("State loaded from localStorage.", state);
            return true;
        } else {
            console.log("No saved state found in localStorage.");
            levels = defaultLevels;
            return false;
        }
    } catch (error) {
        console.error("Error loading state:", error);
        levels = defaultLevels;
        return false;
    }
}

// Save the state before leaving the page
window.addEventListener('beforeunload', function (e) {
    saveState();
});

// =========================
// Initialization
// =========================
document.addEventListener("DOMContentLoaded", async () => {
    await loadTranslations();
    applyTranslations();
    await initializePokerTimer();
});