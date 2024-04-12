import * as sound from "./sound.js";

// Imported for side-effects.
import * as menu from "./menu.js";

const canvas = document.querySelector("#canvas");

const ctx = canvas.getContext("2d");

function resizeCanvas() {
	const dpr = window.devicePixelRatio ?? 1;

	canvas.width = canvas.clientWidth * dpr;
	canvas.height = canvas.clientHeight * dpr;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.save();

	ctx.scale(dpr, dpr);

	ctx.fillRect(0, 0, 20, 20);

	ctx.restore();
}

window.onresize = resizeCanvas;
resizeCanvas();

sound.playMusic("music/prejam-dontuse.mp3"); 
