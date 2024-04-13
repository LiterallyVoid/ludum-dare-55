import * as sound from "./sound.js";
import * as menu from "./menu.js";

const canvas = document.querySelector("#canvas");

const ctx = canvas.getContext("2d");

function resizeCanvas() {
	const dpr = window.devicePixelRatio ?? 1;

	canvas.width = canvas.clientWidth * dpr;
	canvas.height = canvas.clientHeight * dpr;
}

window.onresize = resizeCanvas;
resizeCanvas();

sound.playMusic("music/prejam-dontuse.mp3"); 

let previous_frame = performance.now();

function update(delta) {
}

function draw() {
	const dpr = window.devicePixelRatio ?? 1;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	const width = canvas.width / dpr;
	const height = canvas.height / dpr;

	ctx.save();
	ctx.scale(dpr, dpr);

	ctx.fillRect(width / 2 - 20, height / 2 - 20, 40, 40);
	
	ctx.restore();

}

function tick(time) {
	const delta = (time - previous_frame) / 1000;
	previous_frame = time;

	if (!menu.visible) {
		update(delta);
	}

	draw();

	requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
