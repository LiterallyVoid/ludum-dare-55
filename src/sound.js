const context = new AudioContext();

const all_music_gain = context.createGain();
all_music_gain.connect(context.destination);

const all_effects_gain = context.createGain();
all_effects_gain.connect(context.destination);

// A single music track, looped.
// Starts playing on instantiation, and plays until `stop` is called.
class PlayingMusic {
	constructor(path) {
		this.path = path;
		this.element = new Audio(path);
		this.element.loop = true;
		this.element.autoplay = true;

		this.element.addEventListener("load", () => {
			this.start();
		});

		this.source = context.createMediaElementSource(this.element);
		this.gain = context.createGain();

		this.source.connect(this.gain);
		this.gain.connect(all_music_gain);
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

class Sound {
	constructor(path) {
		// This is an `AudioBuffer`
		this.buffer = null;

		this.load(path);
	}

	async load(path) {
		const bytes = await fetch(path).then(res => res.arrayBuffer());
		const buffer = await context.decodeAudioData(bytes);

		this.buffer = buffer;
	}

	play(gain, pan) {
		if (!this.buffer) return;
		if (!enabled) return;

		const source = context.createBufferSource();
		source.buffer = this.buffer;

		source.start();

		const gain_node = context.createGain();
		gain_node.gain.value = gain;
		source.connect(gain_node);

		const pan_node = context.createStereoPanner();
		pan_node.pan.value = pan;
		gain_node.connect(pan_node);

		pan_node.connect(all_effects_gain);
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
	setGlobalGainNodeVolume(all_music_gain, volume);
}

export function setEffectsVolume(volume) {
	setGlobalGainNodeVolume(all_effects_gain, volume);
}

export function load(path) {
	return new Sound(path);
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
