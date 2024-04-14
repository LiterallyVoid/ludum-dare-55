import * as sound from "./sound.js";

const menu_container = document.querySelector("#menu-container");

export let visible = true;

export function setVisible(visible_) {
	visible = visible_;

	// Make sure to keep this in sync with style.css:#menu-container!
	menu_container.style.display = visible ? "flex" : "none";
}

document.querySelector("#menu__sound-enabled")
	.addEventListener("input", function() {
	sound.setEnabled(this.checked);
});

const music_volume_slider = document.querySelector("#menu__music-volume");
const effects_volume_slider = document.querySelector("#menu__effects-volume");

sound.setMusicVolume(+music_volume_slider.value);
sound.setEffectsVolume(+effects_volume_slider.value);

music_volume_slider.addEventListener("input", function() {
	sound.setMusicVolume(+this.value);
});

effects_volume_slider.addEventListener("input", function() {
	sound.setEffectsVolume(+this.value);
});

window.onblur = () => {
	// MAKE SURE THIS IS CHANGED FOR RELEASE
	// setVisible(true);
};

window.addEventListener("keydown", (e) => {
	if (e.key != "Escape") return;

	setVisible(!visible);

	e.preventDefault();
	e.stopPropagation();
});
