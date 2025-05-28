// DOM Elements
const clocksContainer = document.getElementById('clocks-container');
const timerContainer = document.getElementById('timer-container');
const clockTemplate = document.getElementById('analog-clock-template');
const timezoneSelect = document.getElementById('timezone');
const clockToggle = document.getElementById('clock-toggle');

// Mode buttons
const clockModeBtn = document.getElementById('clock-mode');
const timerModeBtn = document.getElementById('timer-mode');

// Timer elements
const timerDisplay = document.querySelector('.timer-display');
const hoursInput = document.getElementById('hours');
const minutesInput = document.getElementById('minutes');
const secondsInput = document.getElementById('seconds');
const startBtn = document.getElementById('timer-start');
const pauseBtn = document.getElementById('timer-pause');
const resetBtn = document.getElementById('timer-reset');
const timerColorPicker = document.getElementById('timer-color');

// State
let clocks = [];
let currentTimezone = 'local';
let isAnalogView = false;
let isAmPmView = false;
let clockIntervalId = null;
let timerIntervalId = null;
let clockElement = null; // The main clock element
let currentMode = 'clock'; // 'clock' or 'timer'
let timerRunning = false;
let timerPaused = false;
let timerEndTime = 0;
let timerRemainingTime = 0;
let timerColor = '#2196F3';

// Function to save clocks to localStorage
function saveClocksToLocalStorage() {
    localStorage.setItem('userClocks', JSON.stringify(clocks));
}

// Function to load clocks from localStorage
function loadClocksFromLocalStorage() {
    const storedClocks = localStorage.getItem('userClocks');
    if (storedClocks) {
        return JSON.parse(storedClocks);
    }
    return []; // Return empty array if nothing is stored or on first load
}

// Timezone data with display names
const timezoneData = [
    { id: 'local', name: 'Local Time' },
    { id: 'UTC', name: 'UTC' },
    { id: 'America/New_York', name: 'New York' },
    { id: 'America/Chicago', name: 'Chicago' },
    { id: 'America/Denver', name: 'Denver' },
    { id: 'America/Los_Angeles', name: 'Los Angeles' },
    { id: 'Europe/London', name: 'London' },
    { id: 'Europe/Paris', name: 'Paris' },
    { id: 'Asia/Tokyo', name: 'Tokyo' },
    { id: 'Australia/Sydney', name: 'Sydney' }
];

// Initialize the timezone select
function initializeTimezoneSelect() {
    if (!timezoneSelect) return;
    
    // Clear existing options
    timezoneSelect.innerHTML = '';
    
    // Add timezone options
    timezoneData.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz.id;
        option.textContent = tz.name + (tz.id === 'local' ? ' (Current)' : '');
        timezoneSelect.appendChild(option);
    });
    
    // Set default to local timezone if available
    try {
        const localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const tzOption = timezoneData.find(tz => tz.id === localTZ);
        if (tzOption) {
            timezoneSelect.value = localTZ;
        }
    } catch (e) {
        console.log('Could not detect local timezone');
    }
}

// Get time in a specific timezone
function getTimeInTimezone(timezone) {
    const now = new Date();
    if (timezone === 'local') {
        return {
            hours: now.getHours(),
            minutes: now.getMinutes(),
            seconds: now.getSeconds(),
            date: now
        };
    }
    
    try {
        const options = {
            timeZone: timezone === 'UTC' ? 'UTC' : timezone,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        
        const formatter = new Intl.DateTimeFormat('en-US', options);
        const parts = formatter.formatToParts(now);
        
        // Extract time components from the formatted parts
        const timeParts = {};
        parts.forEach(part => {
            if (part.type === 'hour') timeParts.hours = parseInt(part.value);
            if (part.type === 'minute') timeParts.minutes = parseInt(part.value);
            if (part.type === 'second') timeParts.seconds = parseInt(part.value);
        });
        
        // Create a date object with the same date but different time
        const localDate = new Date(now);
        localDate.setHours(timeParts.hours || 0, timeParts.minutes || 0, timeParts.seconds || 0);
        
        return {
            hours: timeParts.hours || 0,
            minutes: timeParts.minutes || 0,
            seconds: timeParts.seconds || 0,
            date: localDate
        };
    } catch (e) {
        console.error('Error with timezone', timezone, e);
        // Fallback to local time
        return {
            hours: now.getHours(),
            minutes: now.getMinutes(),
            seconds: now.getSeconds(),
            date: now
        };
    }
}

// Get timezone display name
function getTimezoneDisplayName(timezoneId) {
    const tz = timezoneData.find(tz => tz.id === timezoneId);
    return tz ? tz.name : timezoneId;
}

// Create a new clock element
function createClockElement(timezone) {
    if (!clockTemplate) return null;
    
    const clockElementInstance = clockTemplate.cloneNode(true);
    clockElementInstance.id = '';
    // clockElementInstance.style.display = 'block'; // This is for the wrapper, should be fine
    
    const timezoneName = getTimezoneDisplayName(timezone);
    const timezoneElement = clockElementInstance.querySelector('.timezone-name');
    if (timezoneElement) {
        timezoneElement.textContent = timezoneName;
    }
    
    // Set data attribute for identification
    clockElementInstance.dataset.timezone = timezone;
    
    // Add remove button handler
    const removeButton = clockElementInstance.querySelector('.remove-clock');
    if (removeButton) {
        removeButton.addEventListener('click', () => removeClock(timezone));
    }

    // --- Issue 1 Fix: Set initial view based on isAnalogView --- 
    const analogPart = clockElementInstance.querySelector('.analog-clock');
    const digitalPart = clockElementInstance.querySelector('.digital-clock');

    if (analogPart && digitalPart) {
        if (isAnalogView) {
            digitalPart.style.display = 'none';
            analogPart.style.display = 'block';
        } else {
            digitalPart.style.display = 'block';
            analogPart.style.display = 'none';
        }
    }
    // Ensure the clock wrapper itself is visible
    clockElementInstance.style.display = 'block';
    // --- End of Issue 1 Fix ---
    
    return clockElementInstance;
}

// Add a new clock
function addClock(timezone) {
    // Simplified duplicate check: if clock timezone already in our list, don't add again.
    if (clocks.includes(timezone)) {
        return; 
    }
    
    const newClockElement = createClockElement(timezone);
    if (!newClockElement) return;
    
    if (clocksContainer) {
        clocksContainer.appendChild(newClockElement);
    }
    if (!clocks.includes(timezone)) { // Add to array only if not already there
        clocks.push(timezone);
    }
    
    saveClocksToLocalStorage(); // Save after adding
    updateTimezoneSelect(); 
    updateClocks(); 
}

// Remove a clock
function removeClock(timezone) {
    const index = clocks.indexOf(timezone);
    if (index === -1) return;
    
    clocks.splice(index, 1); // Remove from array
    saveClocksToLocalStorage(); // Save after removing
    
    // Remove from DOM
    if (clocksContainer) {
        const clockElementInstance = clocksContainer.querySelector(`[data-timezone="${timezone}"]`);
        if (clockElementInstance) {
            clockElementInstance.remove();
        }
    }
    
    updateTimezoneSelect(); // Update the select options
}

// Update the timezone select to only show available timezones
function updateTimezoneSelect() {
    if (!timezoneSelect) return;
    
    // Save current selection
    const currentValue = timezoneSelect.value;
    
    // Clear and repopulate
    timezoneSelect.innerHTML = '';
    
    // Add available timezones (those not already added)
    const availableTimezones = timezoneData.filter(tz => !clocks.includes(tz.id));
    
    if (availableTimezones.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'All timezones added';
        option.disabled = true;
        timezoneSelect.appendChild(option);
        timezoneSelect.disabled = true;
        return;
    }
    
    availableTimezones.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz.id;
        option.textContent = tz.name;
        timezoneSelect.appendChild(option);
    });
    
    // Restore selection if possible, or select first available
    if (availableTimezones.some(tz => tz.id === currentValue)) {
        timezoneSelect.value = currentValue;
    } else if (availableTimezones.length > 0) {
        timezoneSelect.value = availableTimezones[0].id;
    }
    
    timezoneSelect.disabled = false;
}

// Update all clocks
function updateClocks() {
    if (clocks.length === 0 && currentMode === 'clock') {
        // If in clock mode and no clocks, perhaps clear the container or show a message
        // For now, just return to prevent errors if clocksContainer is unexpectedly empty
        if(clocksContainer) clocksContainer.innerHTML = ''; // Clear if no clocks to display
        return;
    }
    
    clocks.forEach(timezone => {
        // Ensure we are selecting from the clocksContainer for multi-clock safety
        const clockElementToUpdate = clocksContainer ? clocksContainer.querySelector(`[data-timezone="${timezone}"]`) : null;
        if (!clockElementToUpdate) return;
        
        const time = getTimeInTimezone(timezone);
        
        const digitalClock = clockElementToUpdate.querySelector('.digital-clock');
        if (digitalClock) {
            let hours = time.hours;
            const minutes = String(time.minutes).padStart(2, '0');
            const seconds = String(time.seconds).padStart(2, '0');
            
            if (isAmPmView) {
                // Convert to 12-hour format
                const period = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
                digitalClock.textContent = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${period}`;
            } else {
                // 24-hour format
                hours = String(hours).padStart(2, '0');
                digitalClock.textContent = `${hours}:${minutes}:${seconds}`;
            }
        }
        
        // Update analog clock
        const analogClock = clockElementToUpdate.querySelector('.analog-clock');
        if (analogClock) {
            const hours = time.hours % 12;
            const minutes = time.minutes;
            const seconds = time.seconds;
            
            const hourDegrees = (hours * 30) + (minutes * 0.5) + 90; // 30 degrees per hour, 0.5 degrees per minute
            const minuteDegrees = (minutes * 6) + (seconds * 0.1) + 90; // 6 degrees per minute, 0.1 degrees per second
            const secondDegrees = (seconds * 6) + 90; // 6 degrees per second
            
            const hourHand = analogClock.querySelector('.hour-hand');
            const minuteHand = analogClock.querySelector('.minute-hand');
            const secondHand = analogClock.querySelector('.second-hand');
            
            if (hourHand) hourHand.style.transform = `translateY(-50%) rotate(${hourDegrees}deg)`;
            if (minuteHand) minuteHand.style.transform = `translateY(-50%) rotate(${minuteDegrees}deg)`;
            if (secondHand) secondHand.style.transform = `translateY(-50%) rotate(${secondDegrees}deg)`;
        }
    });
}

// Toggle between analog and digital view
function toggleView() {
    isAnalogView = clockToggle && clockToggle.checked;
    
    document.querySelectorAll('.clock-wrapper').forEach(clock => {
        const analogClock = clock.querySelector('.analog-clock');
        const digitalClock = clock.querySelector('.digital-clock');
        
        if (analogClock && digitalClock) {
            if (isAnalogView) {
                digitalClock.style.display = 'none';
                analogClock.style.display = 'block';
            } else {
                digitalClock.style.display = 'block';
                analogClock.style.display = 'none';
            }
        }
    });
}

// Switch between clock and timer modes
function switchMode(mode) {
    console.log(`switchMode called with mode: ${mode}. Current mode is: ${currentMode}`); // DEBUG
    if (mode === currentMode) {
        console.log('switchMode: Mode is already current, returning.'); // DEBUG
        return;
    }
    
    currentMode = mode;
    console.log(`switchMode: currentMode changed to: ${currentMode}`); // DEBUG
    
    // Update mode buttons appearance
    if (clockModeBtn) clockModeBtn.classList.toggle('active', mode === 'clock');
    if (timerModeBtn) timerModeBtn.classList.toggle('active', mode === 'timer');
    
    // Show/hide main containers
    if (clocksContainer) clocksContainer.style.display = mode === 'clock' ? 'flex' : 'none';
    if (timerContainer) timerContainer.style.display = mode === 'timer' ? 'flex' : 'none';
    
    if (mode === 'clock') {
        if (clocks.length === 0) {
            addClock('local');
        }
        if (!clockIntervalId) {
            clockIntervalId = setInterval(updateClocks, 1000);
            updateClocks(); // Initial update for clocks
        }
        toggleView(); // Apply current analog/digital view for clocks
    } else { // mode === 'timer'
        if (clockIntervalId) {
            clearInterval(clockIntervalId);
            clockIntervalId = null;
        }
        // Initialize or update timer display and buttons when switching to timer mode
        if (timerDisplay && !timerRunning && !timerPaused) { // Reset to 00:00:00 if not active
             timerDisplay.textContent = '00:00:00';
             timerDisplay.style.color = timerColor;
        }
        updateTimerButtons(); // Ensure timer buttons are in correct state
    }
}

// Timer functions
function startTimer() {
    if (timerRunning && !timerPaused) return;
    
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    
    // Don't start if all values are zero
    if (hours === 0 && minutes === 0 && seconds === 0) return;
    
    if (timerPaused) {
        // Resume from paused state
        timerEndTime = Date.now() + timerRemainingTime;
        timerPaused = false;
    } else {
        // Start new timer
        const totalMilliseconds = (hours * 3600 + minutes * 60 + seconds) * 1000;
        timerEndTime = Date.now() + totalMilliseconds;
        timerRemainingTime = totalMilliseconds;
    }
    
    timerRunning = true;
    updateTimerButtons();
    
    // Clear any existing interval
    if (timerIntervalId) clearInterval(timerIntervalId);
    
    // Start timer update interval
    timerIntervalId = setInterval(updateTimerDisplay, 100);
}

function pauseTimer() {
    if (!timerRunning || timerPaused) return;
    
    timerPaused = true;
    timerRemainingTime = timerEndTime - Date.now();
    if (timerRemainingTime < 0) timerRemainingTime = 0;
    
    updateTimerButtons();
    
    // Clear interval
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
    }
}

function resetTimer() {
    timerRunning = false;
    timerPaused = false;
    timerRemainingTime = 0;
    
    // Clear interval
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
    }
    
    // Reset input fields if they exist
    if (hoursInput) hoursInput.value = 0;
    if (minutesInput) minutesInput.value = 0;
    if (secondsInput) secondsInput.value = 0;
    
    // Reset display
    if (timerDisplay) {
        timerDisplay.textContent = '00:00:00';
        timerDisplay.style.color = timerColor;
    }
    
    updateTimerButtons();
}

function updateTimerDisplay() {
    if (!timerRunning || !timerDisplay) return;
    
    const now = Date.now();
    const timeLeft = timerPaused ? timerRemainingTime : timerEndTime - now;
    
    if (timeLeft <= 0) {
        // Timer finished
        timerDisplay.textContent = '00:00:00';
        timerDisplay.style.color = '#FF0000'; // Red color when finished
        timerRunning = false;
        
        // Clear interval
        if (timerIntervalId) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
        }
        
        updateTimerButtons();
        return;
    }
    
    // Calculate time components
    const totalSeconds = Math.floor(timeLeft / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // Format display
    timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateTimerButtons() {
    if (!startBtn || !pauseBtn || !resetBtn) return;
    
    if (timerRunning) {
        if (timerPaused) {
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            resetBtn.disabled = false;
        } else {
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            resetBtn.disabled = false;
        }
    } else {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        resetBtn.disabled = true;
    }
}

function setTimerColor(color) {
    timerColor = color;
    if (timerDisplay) {
        // Only update color if timer is not finished (not red)
        if (!timerRunning || timerDisplay.style.color !== 'rgb(255, 0, 0)') {
            timerDisplay.style.color = color;
        }
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeTimezoneSelect();

    // Create and Add timezone button ONCE after initializing the select
    const addButton = document.createElement('button');
    addButton.textContent = 'Add Timezone';
    addButton.className = 'add-timezone'; 
    addButton.addEventListener('click', () => {
        if (timezoneSelect && timezoneSelect.value) {
            addClock(timezoneSelect.value);
        }
    });

    if (timezoneSelect && timezoneSelect.parentNode) {
        if (timezoneSelect.nextSibling) {
            timezoneSelect.parentNode.insertBefore(addButton, timezoneSelect.nextSibling);
        } else {
            timezoneSelect.parentNode.appendChild(addButton);
        }
    } else {
        console.error("Could not find parentNode for timezoneSelect to attach Add button.");
    }

    let localClockPresent = false;
    const loadedClocks = loadClocksFromLocalStorage();

    if (loadedClocks.length > 0) {
        clocks = []; // Start with a fresh clocks array for re-population
        loadedClocks.forEach(tz => {
            addClock(tz); // addClock will handle DOM and internal array `clocks`
            if (tz === 'local') {
                localClockPresent = true;
            }
        });
    } else {
        clocks = []; // Ensure clocks array is empty if nothing is loaded
    }

    // If 'local' clock was not among the loaded clocks, add it now.
    if (!localClockPresent) {
        addClock('local');
    }

    // Set up event listeners
    if (clockToggle) {
        clockToggle.addEventListener('change', toggleView);
    }
    
    // AM/PM toggle event listener
    const timeFormatToggle = document.getElementById('time-format-toggle');
    if (timeFormatToggle) {
        timeFormatToggle.addEventListener('change', function() {
            isAmPmView = this.checked;
            updateClocks(); // Update clocks immediately
        });
    }
    
    // Mode switching
    if (clockModeBtn) {
        clockModeBtn.addEventListener('click', () => {
            console.log('Clock mode button clicked'); // DEBUG
            switchMode('clock');
        });
    }
    
    if (timerModeBtn) {
        timerModeBtn.addEventListener('click', () => {
            console.log('Timer mode button clicked'); // DEBUG
            switchMode('timer');
        });
    }
    
    // Timer controls
    if (startBtn) {
        startBtn.addEventListener('click', startTimer);
    }
    
    if (pauseBtn) {
        pauseBtn.addEventListener('click', pauseTimer);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetTimer);
    }
    
    // Timer color picker
    if (timerColorPicker) {
        // Set initial color
        timerColor = timerColorPicker.value;
        
        timerColorPicker.addEventListener('input', () => {
            setTimerColor(timerColorPicker.value);
        });
    }
    
    // Set initial mode
    switchMode('clock'); 

    // updateTimerButtons() is called within switchMode when mode becomes timer,
    // and also after timer operations. Initial call if starting in timer mode is handled by switchMode.
});

// Add some styles for the add button
const style = document.createElement('style');
style.textContent = `
    .add-timezone {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 0.9em;
        margin-left: 10px;
        transition: background 0.3s;
    }
    
    .add-timezone:hover {
        background: #45a049;
    }
    
    .add-timezone:disabled {
        background: #cccccc;
        cursor: not-allowed;
    }
    
    .timezone-selector {
        display: flex;
        align-items: center;
    }
`;
document.head.appendChild(style);