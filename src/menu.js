import * as sound from "./sound.js";

const menu_container = document.querySelector("#menu-container");

export let visible = true;

export function setVisible(visible_) {
	visible = visible_;

	// Make sure to keep this in sync with style.css:#menu-container!
	menu_container.style.display = visible ? "flex" : "none";
}

let restart_callback = null;

export function setRestartCallback(callback) {
	restart_callback = callback;
}

const button_start = document.querySelector("#menu__button-start");
const button_continue = document.querySelector("#menu__button-continue");
const button_restart = document.querySelector("#menu__button-restart");
const button_restart_lost = document.querySelector("#menu__button-restart-lost");

button_start.onclick = () => {
	setVisible(false);
};

button_continue.onclick = () => {
	setVisible(false);
};

button_restart.onclick = 
button_restart_lost.onclick =
() => {
	restart_callback?.();
	setVisible(false);
};

/***
 	@param {"running" | "lost"} state
*/
function displayButtons(state) {
	button_start.style.display = state === "first-run" ? "inline-block" : "none";
	button_restart.style.display = state === "running" ? "inline-block" : "none";
	button_restart_lost.style.display = state === "lost" ? "inline-block" : "none";
	button_continue.style.display = state !== "first-run" ? "inline-block" : "none";
}

displayButtons("first-run");

let lost = false;

export function setLost(lost_) {
	lost = lost_;
}

const music_checkbox = document.querySelector("#menu__sound-enabled");
music_checkbox
	.addEventListener("input", function() {
		sound.setEnabled(this.checked);
	});

sound.setEnabled(music_checkbox.checked);

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
	// setVisible(true);
};

window.addEventListener("keydown", (e) => {
	if (e.key != "Escape") return;

	setVisible(!visible);
	if (visible) {
		displayButtons(lost ? "lost" : "running");
	}

	e.preventDefault();
	e.stopPropagation();
});
