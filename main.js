import * as sound from "./sound.js";

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

document.onmousedown = () => {
};

document.querySelector("#menu__sound-enabled")
	.addEventListener("input", function() {
	sound.setEnabled(this.checked);
});

const musicVolumeSlider = document.querySelector("#menu__music-volume");
const effectsVolumeSlider = document.querySelector("#menu__effects-volume");

sound.setMusicVolume(+musicVolumeSlider.value);
sound.setEffectsVolume(+effectsVolumeSlider.value);

musicVolumeSlider.addEventListener("input", function() {
	sound.setMusicVolume(+this.value);
});

effectsVolumeSlider.addEventListener("input", function() {
	sound.setEffectsVolume(+this.value);
});
