const darkSwitch = document.getElementById('darkSwitch');
const contentDiv = document.getElementById('thelabel');
const iconDiv = document.getElementById('myIcon');

// Function to update the label and icon based on the current state of the toggle
function updateContent() {
  const theme = localStorage.getItem('darkSwitch'); // Retrieve current theme from localStorage
  if (theme === 'dark') {
    contentDiv.innerHTML = " Light Mode";
    iconDiv.classList.add('fa-sun');
    iconDiv.classList.remove('fa-moon');
  } else {
    contentDiv.innerHTML = " Dark Mode";
    iconDiv.classList.add('fa-moon');
    iconDiv.classList.remove('fa-sun');
  }
}

// On page load, check the theme from localStorage and set the toggle accordingly
document.addEventListener('DOMContentLoaded', function() {
  const theme = localStorage.getItem('darkSwitch');
  darkSwitch.checked = (theme === 'dark'); // Set the toggle state based on saved theme
  updateContent(); // Update label and icon based on current toggle state
});

// Listen for changes to the toggle and update the localStorage and UI accordingly
darkSwitch.addEventListener('change', function() {
  const newTheme = darkSwitch.checked ? 'dark' : 'light';
  localStorage.setItem('darkSwitch', newTheme); // Store the new theme in localStorage
  updateContent(); // Update the label and icon based on the new theme
});

// Optional: Listen for storage changes across tabs/windows and sync the toggle state
window.addEventListener('storage', function(event) {
  if (event.key === 'darkSwitch') {
    darkSwitch.checked = (event.newValue === 'dark'); // Sync the toggle state across tabs
    updateContent(); // Update label and icon across windows
  }
});
