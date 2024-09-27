const darkSwitch = document.getElementById('darkSwitch');
const contentDiv = document.getElementById('thelabel');
const iconDiv = document.getElementById('myIcon');

// Function to update the content based on the toggle state
function updateContent() {
  const theme = localStorage.getItem('darkSwitch');
  
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
  if (localStorage.getItem('darkSwitch') === 'dark') {
    darkSwitch.checked = true;
  }
  updateContent();
});

// Listen for the change event on the checkbox
darkSwitch.addEventListener('change', function() {
  if (darkSwitch.checked) {
    localStorage.setItem('darkSwitch', 'dark');
  } else {
    localStorage.removeItem('darkSwitch');
  }
  updateContent();
});
