import * as sound from "./sound.js";

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

