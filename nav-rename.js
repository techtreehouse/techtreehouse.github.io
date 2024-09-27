const darkSwitch = document.getElementById('darkSwitch');
const contentDiv = document.getElementById('thelabel');
const iconDiv = document.getElementById('myIcon');

// Function to update the label and icon based on the current state of the toggle
function updateContent() {
  if (darkSwitch.checked) {
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
  darkSwitch.checked = (theme === 'dark'); // Set the toggle state
  updateContent(); // Update the label and icon based on the toggle
});

// Listen for changes to the toggle
darkSwitch.addEventListener('change', function() {
  const newTheme = darkSwitch.checked ? 'dark' : 'light';
  localStorage.setItem('darkSwitch', newTheme); // Store the new theme in localStorage
  updateContent(); // Update the label and icon after toggling
});

// Optional: Listen for storage changes across tabs
window.addEventListener('storage', function(event) {
  if (event.key === 'darkSwitch') {
    darkSwitch.checked = (event.newValue === 'dark'); // Sync the toggle state
    updateContent(); // Update the label and icon across windows
  }
});
