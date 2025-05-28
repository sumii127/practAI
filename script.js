// DOM Elements
const clocksContainer = document.getElementById('clocks-container');
const clockTemplate = document.getElementById('analog-clock-template');
const timezoneSelect = document.getElementById('timezone');
const clockToggle = document.getElementById('clock-toggle');
const timeFormatToggle = document.getElementById('time-format-toggle');

// State
let clocks = [];
let isAnalogView = false;
let isAmPmView = false;
let intervalId = null;

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
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        let ampm = hours >= 12 ? 'PM' : 'AM';

        if (isAmPmView) {
            hours = hours % 12;
            hours = hours ? hours : 12; // Convert 0 to 12 (for 12 AM/PM)
        }
        // For military time, hours remain 0-23 from now.getHours()

        return {
            hours: hours,
            minutes: minutes,
            seconds: seconds,
            ampm: isAmPmView ? ampm : '', // Only return ampm if in AM/PM view
            date: now
        };
    }
    
    try {
        const options = {
            timeZone: timezone === 'UTC' ? 'UTC' : timezone,
            hour12: isAmPmView,
            hour: isAmPmView ? 'numeric' : '2-digit', // 'numeric' for 1-12, '2-digit' for 00-23
            minute: '2-digit',
            second: '2-digit'
        };
        
        const formatter = new Intl.DateTimeFormat('en-US', options);
        const parts = formatter.formatToParts(now);
        
        const timeParts = {};
        let ampm = '';
        parts.forEach(part => {
            if (part.type === 'hour') timeParts.hours = parseInt(part.value);
            if (part.type === 'minute') timeParts.minutes = parseInt(part.value);
            if (part.type === 'second') timeParts.seconds = parseInt(part.value);
            if (part.type === 'dayPeriod') ampm = part.value;
        });
        
        const localDate = new Date(now);
        // For Intl.DateTimeFormat, hours are already correct (1-12 for AM/PM, 0-23 for military)
        // No need to setHours here again as it might mess up the already formatted hour from `parts`
        // especially if `timeParts.hours` is 12 PM (which is 12) or 12 AM (which is 0 for Date object but 12 for display)
        // We will use the `timeParts.hours` directly.

        return {
            hours: timeParts.hours || 0,
            minutes: timeParts.minutes || 0,
            seconds: timeParts.seconds || 0,
            ampm: isAmPmView ? ampm : '', // Only return ampm if in AM/PM view
            date: localDate // Date object is still useful for other potential operations
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
    
    const clockElement = clockTemplate.cloneNode(true);
    clockElement.id = '';
    clockElement.style.display = 'block';
    
    const timezoneName = getTimezoneDisplayName(timezone);
    const timezoneElement = clockElement.querySelector('.timezone-name');
    if (timezoneElement) {
        timezoneElement.textContent = timezoneName;
    }
    
    // Set data attribute for identification
    clockElement.dataset.timezone = timezone;
    
    // Add remove button handler
    const removeButton = clockElement.querySelector('.remove-clock');
    if (removeButton) {
        removeButton.addEventListener('click', () => removeClock(timezone));
    }
    
    return clockElement;
}

// Add a new clock
function addClock(timezone) {
    if (clocks.includes(timezone)) return; // Don't add duplicate timezones
    
    const clockElement = createClockElement(timezone);
    if (!clockElement) return;
    
    clocksContainer.appendChild(clockElement);
    clocks.push(timezone);
    
    // Update the select to show the next available timezone
    updateTimezoneSelect();
    
    // Update immediately
    updateClocks();
}

// Remove a clock
function removeClock(timezone) {
    const index = clocks.indexOf(timezone);
    if (index === -1) return;
    
    // Remove from array
    clocks.splice(index, 1);
    
    // Remove from DOM
    const clockElement = document.querySelector(`[data-timezone="${timezone}"]`);
    if (clockElement) {
        clockElement.remove();
    }
    
    // Update the select options
    updateTimezoneSelect();
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
    if (clocks.length === 0) return;
    
    clocks.forEach(timezone => {
        const clockElement = document.querySelector(`[data-timezone="${timezone}"]`);
        if (!clockElement) return;
        
        const time = getTimeInTimezone(timezone);
        
        const digitalClock = clockElement.querySelector('.digital-clock');
        if (digitalClock) {
            let hoursString;
            if (isAmPmView) {
                hoursString = String(time.hours); // Display 1-12 directly
            } else {
                // For military time, ensure original hours (0-23) are padded
                // The getTimeInTimezone for 'local' now returns 0-23 directly if not isAmPmView.
                // For other timezones, '2-digit' option in Intl ensures padding.
                // However, to be safe and consistent, especially for local time military:
                let militaryHours = time.hours;
                if (timezone === 'local' && !isAmPmView) {
                    // if it came from local, it's already 0-23, just pad it.
                    // if it came from Intl, it's already padded '00'-'23' if not ampm.
                    // So, this String(militaryHours).padStart(2, '0') is generally safe.
                }
                 hoursString = String(militaryHours).padStart(2, '0');
            }
            const minutes = String(time.minutes).padStart(2, '0');
            const seconds = String(time.seconds).padStart(2, '0');
            const ampmString = time.ampm ? ` ${time.ampm}` : ''; // time.ampm will be empty if not isAmPmView
            digitalClock.textContent = `${hoursString}:${minutes}:${seconds}${ampmString}`;
        }
        
        // Update analog clock
        const analogClock = clockElement.querySelector('.analog-clock');
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
    
    // Update immediately after toggling
    updateClocks();
}

// Toggle between AM/PM and military time
function toggleTimeFormat() {
    isAmPmView = timeFormatToggle && timeFormatToggle.checked;
    updateClocks();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize timezone select
    initializeTimezoneSelect();
    
    // Add default clock (local time)
    addClock('local');
    
    // Set up event listeners
    if (clockToggle) {
        clockToggle.addEventListener('change', () => {
            toggleView();
        });
    }
    
    if (timeFormatToggle) {
        timeFormatToggle.addEventListener('change', () => {
            toggleTimeFormat();
        });
    }
    
    // Add timezone button
    const addButton = document.createElement('button');
    addButton.textContent = 'Add Timezone';
    addButton.className = 'add-timezone';
    addButton.addEventListener('click', () => {
        if (timezoneSelect && timezoneSelect.value) {
            addClock(timezoneSelect.value);
        }
    });
    
    // Add the button after the timezone select
    if (timezoneSelect && timezoneSelect.parentNode) {
        timezoneSelect.parentNode.appendChild(addButton);
    }
    
    // Start the clock updates
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(updateClocks, 1000);
    
    // Initial update
    updateClocks();
    toggleView();
    toggleTimeFormat();
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