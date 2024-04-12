import * as sound from "./sound.js";

const menuContainer = document.querySelector("#menu-container");

export let visible = true;

export function setVisible(visible_) {
	visible = visible_;

	// Make sure to keep this in sync with style.css:#menu-container!
	menuContainer.style.display = visible ? "flex" : "none";
}

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

window.onblur = () => {
	setVisible(true);
};

window.addEventListener("keydown", (e) => {
	if (e.key != "Escape") return;

	setVisible(!visible);

	e.preventDefault();
	e.stopPropagation();
});
