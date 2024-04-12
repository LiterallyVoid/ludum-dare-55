const context = new AudioContext();

const allMusicGain = context.createGain();
allMusicGain.connect(context.destination);

const allEffectsGain = context.createGain();
allEffectsGain.connect(context.destination);

// A single music track, looped.
// Starts playing on instantiation, and plays until `stop` is called.
class PlayingMusic {
	constructor(path) {
		this.path = path;
		this.element = new Audio(path);
		this.element.loop = true;

		this.source = context.createMediaElementSource(this.element);
		this.gain = context.createGain();

		this.source.connect(this.gain);
		this.gain.connect(allMusicGain);
	}

	start() {
		this.element.play();
	}

	// Stop playing this music track with a fade.
	stop() {
		const fade_time = 0.1;
		this.gain.gain.linearRampToValueAtTime(
			0.0,
			context.currentTime + fade_time,
		);

		setTimeout(() => {
			this.element.pause();
		}, fade_time * 1000.0);
	}
}

let music = null;

let enabled = false;

export function setEnabled(enabled_) {
	enabled = enabled_;

	if (enabled) {
		context.resume();

		if (music) {
			music.start();
		}
	} else {
		context.suspend();
	}
}

function setGlobalGainNodeVolume(node, volume) {
	volume = Math.pow(volume, 2.0);
	const fade_time = 0.02;
	node.gain.linearRampToValueAtTime(volume, context.currentTime + fade_time);
}

export function setMusicVolume(volume) {
	setGlobalGainNodeVolume(allMusicGain, volume);
}

export function setEffectsVolume(volume) {
	setGlobalGainNodeVolume(allEffectsGain, volume);
}

export function playSound(path) {
	const stream = new Audio(path);
	stream.play();
}

export function playMusic(path) {
	if (music != null) {
		music.stop();
		music = null;
	}

	music = new PlayingMusic(path);
	if (enabled) {
		music.start();
	}
}
