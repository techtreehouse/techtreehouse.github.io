function updateContent() {
	const theme = localStorage.getItem('darkSwitch');
	const contentDiv = document.getElementById('thelabel');
	const iconDiv = document.getElementById('myIcon');
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
	myIcon.style.display = 'inline';
}
document.addEventListener('DOMContentLoaded', updateContent);
/*document.addEventListener('change', function() {
	updateContent();
});*/
