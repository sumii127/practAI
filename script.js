const digitalClockElement = document.getElementById('digital-clock');
const analogClockContainer = document.getElementById('analog-clock-container');
const digitalClockContainer = document.getElementById('clock-container'); // Renamed in HTML
const hourHand = document.getElementById('hour-hand');
const minuteHand = document.getElementById('minute-hand');
const secondHand = document.getElementById('second-hand');
const clockToggle = document.getElementById('clock-toggle');

let intervalId = null; // To store the interval ID

function updateDigitalClock() {
    if (digitalClockElement) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        digitalClockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

function updateAnalogClock() {
    const now = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    const secondsDegrees = ((seconds / 60) * 360) + 90; // offset by 90 degrees because of initial CSS transform
    const minutesDegrees = ((minutes / 60) * 360) + ((seconds/60)*6) + 90; // offset for seconds and initial CSS
    const hoursDegrees = ((hours / 12) * 360) + ((minutes/60)*30) + 90; // offset for minutes and initial CSS

    if(secondHand) secondHand.style.transform = `translateY(-50%) rotate(${secondsDegrees}deg)`;
    if(minuteHand) minuteHand.style.transform = `translateY(-50%) rotate(${minutesDegrees}deg)`;
    if(hourHand) hourHand.style.transform = `translateY(-50%) rotate(${hoursDegrees}deg)`;
}

function updateClocks() {
    if (clockToggle && clockToggle.checked) { // Analog clock is active
        updateAnalogClock();
    } else { // Digital clock is active
        updateDigitalClock();
    }
}

if (clockToggle) {
    clockToggle.addEventListener('change', function() {
        if (this.checked) { // Switch to Analog
            if(digitalClockContainer) digitalClockContainer.style.display = 'none';
            if(analogClockContainer) analogClockContainer.style.display = 'flex';
            updateAnalogClock(); // Initial update for analog when switched
        } else { // Switch to Digital
            if(digitalClockContainer) digitalClockContainer.style.display = 'flex'; // Or 'block' depending on original style
            if(analogClockContainer) analogClockContainer.style.display = 'none';
            updateDigitalClock(); // Initial update for digital when switched
        }
        // Clear previous interval and set a new one to ensure only one clock type updates per second
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(updateClocks, 1000);
    });
}

// Initial setup
function initializeClocks() {
    if (clockToggle && clockToggle.checked) {
        if(digitalClockContainer) digitalClockContainer.style.display = 'none';
        if(analogClockContainer) analogClockContainer.style.display = 'flex';
        updateAnalogClock();
    } else {
        if(digitalClockContainer) digitalClockContainer.style.display = 'flex';
        if(analogClockContainer) analogClockContainer.style.display = 'none';
        updateDigitalClock();
    }
    if (intervalId) clearInterval(intervalId); // Clear any existing interval
    intervalId = setInterval(updateClocks, 1000);
}

initializeClocks(); // Call immediately to set up based on initial toggle state (unchecked = digital) 