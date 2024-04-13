import * as sound from "./sound.js";
import * as menu from "./menu.js";
import { canvas, ctx } from "./gfx.js";

let width, height;

const cellTypes = {
	empty: {},
};

sound.playMusic("music/prejam-dontuse.mp3"); 

let previous_frame = performance.now();

class RepeaterTurret {
	constructor(proto) {
		this.proto = proto;
	}
}

function img(path) {
	const img = new Image();
	img.src = path;

	return img;
}

const buildables = {
	repeater: {
		name: "Repeater Turret",
		hurtbox: img("assets/damageprojline.svg"),
		hurtboxAnchor: [0.5, 1.0],
		image: img("assets/turret-repeater.svg"),
		cls: RepeaterTurret,
	},
	shockwave: {
		name: "Shockwave Turret",
		hurtbox: img("assets/damageshock.svg"),
		hurtboxAnchor: [0.5, 0.5],
		image: img("assets/turret-shockwave.svg"),
		cls: RepeaterTurret,
	},
};

class GridCell {
	constructor() {
		// Flyweighted to `cellTypes`
		this.backing = null;
		this.entity = null;
	}
}

class Board {
	constructor() {
		this.pos = [0, 0];

		this.width = 6;
		this.height = 6;
		this.grid = [];

		for (let x = 0; x < this.width; x++) {
			this.grid.push([]);
			for (let y = 0; y < this.height; y++) {
				this.grid[x].push(new GridCell(cellTypes.empty));
			}
		}
	}

	update(delta) {
	}

	draw() {
		const cellSize = 64;
		ctx.fillStyle = "#333";
		ctx.fillRect(
			this.pos[0] - this.width * cellSize * 0.5,
			this.pos[1] - this.height * cellSize * 0.5,
			this.width * cellSize,
			this.height * cellSize,
		);
	}
}

function drawImage(image, anchor, pos, angle) {
	ctx.save();
	ctx.translate(pos[0], pos[1]);
	ctx.rotate(angle);
	ctx.translate(-anchor[0] * image.width, -anchor[1] * image.height);
	ctx.drawImage(image, 0, 0);
	ctx.restore();
}

class PaletteEntry {
	constructor(item, count) {
		this.item = item;
		this.count = count;

		this.pos = [0, 0];

		this.hover = false;
	}

	update() {
	}

	draw() {
		const [x, y] = this.pos;

		ctx.fillStyle = "#FFF";
		ctx.font = "Bold 20px sans";
		ctx.textAlign = "center";
		ctx.fillText(this.count, x, y - 80);

		const buildable = buildables[this.item];

		drawImage(buildable.image, [0.5, 0.5], [x, y - 40], 0);
		drawImage(buildable.hurtbox, buildable.hurtboxAnchor, [x, y - 40], 0);
	}
}

class Palette {
	constructor() {
		this.deck = [
			new PaletteEntry("repeater", 1),
			new PaletteEntry("shockwave", 8),
		];

		this.pos = [0, 0];
	}

	update(delta) {
		let cellWidth = 80;


		let x = this.pos[0]
			- (this.deck.length - 1) * cellWidth / 2;

		for (const item of this.deck) {
			item.pos = [x, this.pos[1]];
			x += cellWidth;

			item.update(delta);
		}
	}

	draw() {
		for (let i = 0; i < this.deck.length; i++) {
			const item = this.deck[i];
			item.draw();
		}
	}
}

function update(delta) {
	game.palette.pos = [width / 2, height];
	game.palette.update(delta);

	game.board.pos = [width / 2, height / 2];
	game.board.update(delta);
}

const game = {
	palette: new Palette(),
	board: new Board(),
};

function draw() {
	const dpr = window.devicePixelRatio ?? 1;

	width = canvas.width / dpr;
	height = canvas.height / dpr;

	canvas.onresize

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.save();
	ctx.scale(dpr, dpr);

	game.board.draw(width / 2, height / 2);
	game.palette.draw();
	
	ctx.restore();

}

function tick(time) {
	const delta = (time - previous_frame) / 1000;
	previous_frame = time;

	update(menu.visible ? 0 : delta);

	draw();

	requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
