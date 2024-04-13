export const canvas = document.querySelector("#canvas");
export const ctx = canvas.getContext("2d");

function resizeCanvas() {
	const dpr = window.devicePixelRatio ?? 1;

	canvas.width = window.innerWidth * dpr;
	canvas.height = window.innerHeight * dpr;

	canvas.style.width = (canvas.width / dpr) + 'px';
	canvas.style.height = (canvas.height / dpr) + 'px';
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();


