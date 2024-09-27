const darkSwitch = document.getElementById('darkSwitch');
const contentDiv = document.getElementById('thelabel');
const iconDiv = document.getElementById('myIcon');

// Function to update the content based on the toggle state
function updateContent(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    contentDiv.innerHTML = " Light Mode";
    iconDiv.classList.add('visible', 'fa-sun');
    iconDiv.classList.remove('fa-moon');
  } else {
    document.documentElement.removeAttribute('data-theme');
    contentDiv.innerHTML = " Dark Mode";
    iconDiv.classList.add('visible', 'fa-moon');
    iconDiv.classList.remove('fa-sun');
  }
}

// Check stored theme preference and apply it on load
document.addEventListener('DOMContentLoaded', function() {
  const theme = localStorage.getItem('darkSwitch') === 'dark' ? 'dark' : 'light';
  darkSwitch.checked = theme === 'dark';  // Check the switch if theme is dark
  updateContent(theme);  // Update content on load
});

// Listen for the change event on the checkbox
darkSwitch.addEventListener('change', function() {
  const theme = darkSwitch.checked ? 'dark' : 'light';
  if (theme === 'dark') {
    localStorage.setItem('darkSwitch', 'dark');
  } else {
    localStorage.removeItem('darkSwitch');
  }
  updateContent(theme);  // Update content on switch change
});
