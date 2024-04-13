export const canvas = document.querySelector("#canvas");
export const ctx = canvas.getContext("2d");

function resizeCanvas() {
	const dpr = window.devicePixelRatio ?? 1;

	canvas.width = canvas.clientWidth * dpr;
	canvas.height = canvas.clientHeight * dpr;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();


