// theme-selector.js

document.addEventListener('DOMContentLoaded', () => {
    const themeOptions = document.querySelectorAll('.theme-option');
    const body = document.body;
    const currentPath = window.location.pathname;

    // Function to apply a theme
    function applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('selectedTheme', themeName);
    }

    // Load and apply saved theme on any page that includes this script
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Optionally, apply a default theme if none is saved
        applyTheme('light'); // Default to light theme if nothing is stored
    }

    // Add class to body of themes.html for specific styling
    if (currentPath.includes('themes.html')) {
        body.classList.add('theme-selection-page');
    }

    // Event listeners for theme options on themes.html
    if (themeOptions.length > 0) {
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const selectedTheme = option.getAttribute('data-theme');
                applyTheme(selectedTheme);
                // Optionally, provide feedback or redirect
                // alert(`Theme set to ${selectedTheme}! You can now go back to the clocks.`);
            });
        });
    }

    // Logic for the main clock page (index.html)
    if (currentPath.includes('index.html') || currentPath === '/' || currentPath === '/Github%20Practice/') {
        const inlineControlsGroup = document.getElementById('inline-controls-group'); // Get the new group

        if (inlineControlsGroup) {
            const themeButton = document.createElement('a');
            themeButton.href = 'themes.html';
            themeButton.textContent = 'Change Theme';
            themeButton.classList.add('theme-button');
            inlineControlsGroup.appendChild(themeButton); // Add theme button to the new group
        }
    }
}); 