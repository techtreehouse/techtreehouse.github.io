const theme = localStorage.getItem('darkSwitch');
const contentDiv = document.getElementById('thelabel');
const iconDiv = document.getElementById('myIcon');

function updateContent() {
	if (theme === 'dark') {
		contentDiv.innerHTML = " Light Mode";
		iconDiv.classList.add('visible');
		iconDiv.classList.add('fa-sun');
		//iconDiv.classList.remove('fa-moon');
	} else if(theme === 'null') {
		contentDiv.innerHTML = " Dark Mode";
		iconDiv.classList.add('visible');
		iconDiv.classList.add('fa-moon');
		iconDiv.classList.remove('fa-sun');
	}
}
document.addEventListener('DOMContentLoaded', updateContent);
/*document.addEventListener('change', function() {
	updateContent();
});*/

window.addEventListener("load", (function() {
    if (theme) {
        updateContent()
        theme.addEventListener("change", (function() {
            updateContent()
        }))
    }
}));
