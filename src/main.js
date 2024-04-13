import * as sound from "./sound.js";
import * as menu from "./menu.js";
import { canvas, ctx } from "./gfx.js";

let width, height;

function img(path) {
	const img = new Image();
	img.src = path;

	return img;
}

const cellTypes = {
	empty: {
		// Whether or not turrets can be built on this cell.
		buildable: true,

		// Whether or not things can fly over this cell.
		fliable: true,
	},

	mountain: {
		image: img("assets/mountain.svg"),

		buildable: false,
		fliable: false,
	},
};

sound.playMusic("music/prejam-dontuse.mp3"); 

let previous_frame = performance.now();

class BoardEntity {
	constructor(board, relativePos, radius) {
		this.board = board;
		this.relativePos = relativePos;
		this.pos = [0, 0];

		this.radius = radius;
	}

	update(delta) {
		this.pos = this.board.cellToGlobal(this.relativePos);
	}
}

class Turret extends BoardEntity {
	constructor(board, proto, relativePos, rotation) {
		super(board, relativePos, 0.5);

		this.proto = proto;
		this.rotation = rotation;

		this.refire = 0;

		this.onGrid = true;
	}

	update(delta) {
		super.update(delta);
		this.refire -= delta;
	}

	draw() {
		drawImage(this.proto.image, [0.5, 0.5], this.pos, this.rotation * Math.PI * 0.5);
	}
}

class RepeaterBullet extends BoardEntity {
	constructor(board, proto, controller, relativePos, velocity) {
		super(board, relativePos, 0.05);
		this.proto = proto;

		this.controller = controller;

		this.velocity = velocity;
	}

	update(delta) {
		super.update(delta);

		this.relativePos[0] += this.velocity[0] * delta;
		this.relativePos[1] += this.velocity[1] * delta;

		const cell = this.board.cell(this.relativePos);
		if (!cell) this.dead = true;

		if (!cell.backing.fliable) this.dead = true;

		for (const entity of this.board.entitiesNear(this.relativePos, this.radius)) {
			if (entity === this.controller) continue;
			if (entity === this) continue;

			// entity.damage();

			this.dead = true;
		}
		
		this.pos = this.board.cellToGlobal(this.relativePos);
	}

	draw() {
		ctx.fillStyle = "#F0F";
		ctx.fillRect(this.pos[0] - 5, this.pos[1] - 5, 10, 10);
	}
}

class RepeaterTurret extends Turret {
	constructor(board, proto, relativePos, rotation) {
		super(board, proto, relativePos, rotation);
	}

	update(delta) {
		super.update(delta);
		if (this.refire < 0) {
			this.refire += 0.2;
			if (this.refire < 0) this.refire = 0;

			const angle = this.rotation * Math.PI * 0.5;

			const bulletVelocity = [
				Math.sin(angle) * 4.0,
				-Math.cos(angle) * 4.0,
			];

			this.board.spawn(new RepeaterBullet(this.board, {}, this, [...this.relativePos], bulletVelocity));
		}
	}

	draw() {
		super.draw();
	}
}

class ShockwaveTurret extends Turret {
	constructor(board, proto, relativePos, rotation) {
		super(board, proto, relativePos, rotation);
	}

	update(delta) {
		super.update(delta);

		if (this.refire < 0) {
			this.refire += 0.8;
			if (this.refire < 0) this.refire = 0;
		}
	}

	draw() {
		super.draw();
	}
}

const buildables = {
	repeater: {
		name: "Repeater Turret",
		hurtbox: img("assets/damageprojline.svg"),
		hurtboxAnchor: [0.5, 1.0],
		image: img("assets/turret-repeater.svg"),
		cls: RepeaterTurret,

		rotatable: true,
	},
	shockwave: {
		name: "Shockwave Turret",
		hurtbox: img("assets/damageshock.svg"),
		hurtboxAnchor: [0.5, 0.5],
		image: img("assets/turret-shockwave.svg"),
		cls: ShockwaveTurret,

		rotatable: false,
	},
};

class GridCell {
	constructor() {
		// Flyweighted to `cellTypes`
		this.backing = cellTypes.empty;
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

		this.cell_size = 64;

		this.grid[0][0].backing = cellTypes.mountain;
		this.grid[1][4].backing = cellTypes.mountain;
		this.grid[5][3].backing = cellTypes.mountain;
		this.grid[4][5].backing = cellTypes.mountain;
		this.grid[2][2].backing = cellTypes.mountain;

		this.entities = [];
	}

	spawn(ent) {
		this.entities.push(ent);

		if (ent.onGrid) {
			this.cell(ent.relativePos).entity = ent;
		}
	}

	update(delta) {
		for (let i = 0; i < this.entities.length; i++) {
			const ent = this.entities[i];

			ent.update(delta);
			if (ent.dead) {
				if (ent.onGrid) {
					const cell = this.cell(ent.relativePosition);
					
					if (cell.entity === ent) cell.entity = null;
				}
				this.entities.splice(i, 1);
				i--;
				continue;
			}
		}
	}

	cell(pos) {
		pos = [
			Math.round(pos[0]),
			Math.round(pos[1]),
		];

		if (pos[0] < 0 || pos[0] >= this.width) return;
		if (pos[1] < 0 || pos[1] >= this.height) return;
		
		return this.grid[pos[0]][pos[1]];
	}

	globalToCell(global) {
		let x = (global[0] - this.pos[0] + this.width * this.cell_size * 0.5) / this.cell_size;
		let y = (global[1] - this.pos[1] + this.height * this.cell_size * 0.5) / this.cell_size;

		x = Math.floor(x);
		y = Math.floor(y);

		if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;

		return [x, y];
	}

	cellToGlobal(cell) {
		return [
			this.pos[0] - this.width * this.cell_size * 0.5
				+ (cell[0] + 0.5) * this.cell_size,
			this.pos[1] - this.height * this.cell_size * 0.5
				+ (cell[1] + 0.5) * this.cell_size,
		];
	}

	clip() {
		ctx.beginPath();
		ctx.rect(
			this.pos[0] - this.width * this.cell_size * 0.5,
			this.pos[1] - this.height * this.cell_size * 0.5,
			this.width * this.cell_size,
			this.height * this.cell_size,
		);
		ctx.clip();
	}

	entitiesNear(point, radius) {
		const result = [];

		for (const entity of this.entities) {
			const positionDiff = [
				point[0] - entity.relativePos[0],
				point[1] - entity.relativePos[1],
			];

			const distanceSquared =
				Math.pow(positionDiff[0], 2)
			  + Math.pow(positionDiff[1], 2);

			if (distanceSquared < Math.pow(radius + entity.radius, 2)) {
				result.push(entity);
			}
		}

		return result;
	}

	draw() {
		ctx.fillStyle = "#010915";
		ctx.fillRect(
			this.pos[0] - this.width * this.cell_size * 0.5,
			this.pos[1] - this.height * this.cell_size * 0.5,
			this.width * this.cell_size,
			this.height * this.cell_size,
		);

		for (let x = 0; x < this.width; x++) {
			for (let y = 0; y < this.height; y++) {
				const cell = this.grid[x][y];
				let pos = this.cellToGlobal([x, y]);

				if (cell.backing != null && cell.backing.image) {
					drawImage(cell.backing.image, [0.5, 0.5], pos, 0.0);
				}
			}
		}

		for (const entity of this.entities) {
			entity.draw();
		}
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

let events = [];
let cursor = "default";

class EventMouseMove {
	constructor(pos, relative) {
		this.pos = pos;
		this.relative = relative;
	}
}

class EventMouseDown {
	constructor(button) {
		this.button = button;
	}
}

class EventMouseUp {
	constructor(button) {
		this.button = button;
	}
}

class EventMouseWheel {
	constructor(delta) {
		this.delta = delta;
	}
}

class EventKeyDown {
	constructor(key) {
		this.key = key;
	}
}

const event_blur = Symbol();

// Should only be used by hovered or captured objects.
// HACK: remove SMI object shape optimization. PREMATURE MUCH??
const mouse_position = [-0.0, -0.0];

let event_capture = null;
let event_capture_polled_this_frame = false;

/// This should be called once per unique object.
/// `callback` will be called for each event.
/// It should return `null` or `undefined` for an event that it does not want to consume.
/// It should return `true` for an item that it does want to consume.
/// It should return another event, or an array of events, if it wants to modify the event before it's passed to other objects.
function poll(obj, callback) {
	if (event_capture != null) {
		if (obj !== event_capture) {
			return;
		}

		event_capture_polled_this_frame = true;
	}

	events = events.flatMap(item => {
		const res = callback(item);

		if (res == null) return [item];
		if (res == true) return [];

		return res;
	});
}

function capture(obj) {
	console.assert(event_capture == null);
	event_capture = obj;
}

function releaseCapture() {
	event_capture = null;

}

function captured(obj) {
	return event_capture === obj;
}

class Smooth {
	constructor(initial) {
		this.value = initial;
		this.velocity = 0;
	}

	tick(delta, target, acc, damp) {
		damp = damp ?? 0.15;
		target -= this.velocity / (acc / damp);
		this.velocity += (target - this.value) * acc * delta;
		this.value += this.velocity * delta;
	}

	set(value) {
		this.value = value;
	}

	valueOf() {
		return this.value;
	}
}

class SmoothAngle extends Smooth {
	tick(delta, target, acc, damp) {
		function diffwrap(angle) {
			const tau = Math.PI * 2;
			return ((angle + Math.PI) % tau + tau) % tau - Math.PI;
		}
		this.value = target + diffwrap(this.value - target);
		super.tick(delta, target, acc, damp);
	}
}

class SmoothVec {
	constructor(initial) {
		this[0] = initial[0];
		this[1] = initial[1];
		this.length = 2;

		this.value = initial;
		this.velocity = [0, 0];
	}

	tick(delta, target, acc, damp) {
		damp = damp ?? 0.15;
		target = [
			target[0] - this.velocity[0] / (acc / damp),
			target[1] - this.velocity[1] / (acc / damp),
		];

		this.velocity[0] += (target[0] - this[0]) * acc * delta;
		this.velocity[1] += (target[1] - this[1]) * acc * delta;

		this[0] += this.velocity[0] * delta;
		this[1] += this.velocity[1] * delta;
	}

	set(value) {
		this[0] = value[0];
		this[1] = value[1];

		this.velocity = [0, 0];
	}
}

class PaletteEntry {
	constructor(item, count) {
		this.item = item;
		this.count = count;

		this.pos = [0, 0];

		this.hover = false;
		this.popup = new Smooth(0);

		this.dragging = false;
		this.dragPos = new SmoothVec(0);
		this.dragAngle = new Smooth(0);

		this.dragBoard = null;
		this.dragBoardCell = null;

		// In half-turns: always 0 / 1 / 2 / 3
		this.rotation = 0;
	}

	update(delta) {
		if (this.dragging && !captured(this)) {
			this.dragging = false;
		}

		if (!this.dragging && captured(this)) {
			releaseCapture();
		}

		poll(this, (event) => {
			if (event === event_blur) {
				this.hover = false;
				return;
			}

			if (event instanceof EventMouseMove) {
				if (event.pos[0] >= this.pos[0] - 40 &&
					event.pos[0] <= this.pos[0] + 40 &&
					event.pos[1] >= this.pos[1] - 90 &&
					event.pos[1] <= this.pos[1]) {
					this.hover = true;
				} else {
					this.hover = false;
				}

				if (this.dragging) {
					return true;
				}
			}

			if (this.hover && event instanceof EventMouseDown && event.button === 0 && this.count > 0) {
				capture(this);
				this.dragging = true;

				this.dragPos.set(this.pos);
				this.dragAngle.set(0);

				this.rotation = 0;
				this.dragBoard = null;
				this.dragBoardCell = null;

				return true;
			}

			if (this.dragging) {
				if (event instanceof EventKeyDown && event.key == "r") {
					this.rotation++;
				}

				if (event instanceof EventMouseWheel) {
					if (event.delta[1] < 0) {
						this.rotation--;
					} else if (event.delta[1] > 0) {
						this.rotation++;
					}
				}

				if (!buildables[this.item].rotatable) {
					this.rotation = 0;
				}

				if (this.rotation < 0) {
					this.rotation += 4;
					this.dragAngle.value += Math.PI * 2;
				}
				if (this.rotation >= 4) {
					this.rotation -= 4;
					this.dragAngle.value -= Math.PI * 2;
				}

				if (event instanceof EventMouseUp && event.button === 0) {
					this.dragging = false;

					this.tryPlace();
				}
			}
		});

		if (this.hover || this.dragging) {
			cursor = "pointer";
			this.popup.tick(delta, 20, 500.0, 25.0);
		} else {
			this.popup.tick(delta, 0, 80.0, 8.0);
		}

		if (this.dragging) {
			this.dragBoard = game.board;
			this.dragBoardCell = this.dragBoard.globalToCell(mouse_position);

			if (this.dragBoardCell) {
				const cell = this.dragBoard.cell(this.dragBoardCell);
				if (cell.entity) this.dragBoardCell = null;
				if (!cell.backing.buildable) this.dragBoardCell = null;
			}

			if (this.dragBoardCell) {
				this.dragPos.tick(delta, this.dragBoard.cellToGlobal(this.dragBoardCell), 1200.0, 50.0);
			} else {
				this.dragPos.tick(delta, mouse_position, 400.0, 25.0);
			}
			this.dragAngle.tick(delta, this.rotation * Math.PI * 0.5, 400.0, 25.0);
		}
	}

	tryPlace() {
		if (!this.dragBoard) return;
		if (!this.dragBoardCell) return;

		if (this.count <= 0) return;

		const cell = this.dragBoard.cell(this.dragBoardCell);
		if (!cell.backing.buildable) return;

		if (cell.entity) return;

		const buildable = buildables[this.item];

		const entity = new buildable.cls(this.dragBoard, buildable, this.dragBoardCell, this.rotation);

		this.dragBoard.spawn(entity);

		this.count--;
	}

	draw() {
		let [x, y] = this.pos;
		y -= this.popup;

		ctx.fillStyle = "#FFF";
		ctx.font = "Bold 20px sans";
		ctx.textAlign = "center";

		const count = this.count - (this.dragging ? 1 : 0);

		const buildable = buildables[this.item];

		ctx.save();
		if (count == 0) {
			ctx.globalAlpha = 0.5;
		}

		ctx.fillText(this.count - (this.dragging ? 1 : 0), x, y - 80);

		drawImage(buildable.image, [0.5, 0.5], [x, y - 40], 0);
		// drawImage(buildable.hurtbox, buildable.hurtboxAnchor, [x, y - 40], 0);

		ctx.globalAlpha = 1.0;


		if (this.dragging) {
			drawImage(buildable.image, [0.5, 0.5], this.dragPos, this.dragAngle);

			// Clip the hurtbox into the board.
			if (this.dragBoard && this.dragBoardCell) {
				this.dragBoard.clip();
				drawImage(buildable.hurtbox, buildable.hurtboxAnchor, this.dragPos, this.dragAngle);
			}
		}

		ctx.restore();
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

	cursor = "default";
	event_capture_polled_this_frame = false;
	const was_captured = event_capture != null;

	update(menu.visible ? 0 : delta);

	draw();

	requestAnimationFrame(tick);

	events = [];
	if (was_captured && !event_capture_polled_this_frame && event_capture) {
		event_capture = null;
	}

	canvas.style.cursor = cursor;
}

requestAnimationFrame(tick);

canvas.addEventListener("mousemove", (e) => {
	events.push(new EventMouseMove([e.offsetX, e.offsetY], [e.movementX, e.movementY]));
	mouse_position[0] = e.offsetX;
	mouse_position[1] = e.offsetY;
});

canvas.addEventListener("mousedown", (e) => {
	events.push(new EventMouseDown(e.button));
});
canvas.addEventListener("mouseup", (e) => {
	events.push(new EventMouseUp(e.button));
});

window.addEventListener("keydown", (e) => {
	if (menu.visible) return;

	events.push(new EventKeyDown(e.key));
});

window.addEventListener("mousewheel", (e) => {
	if (menu.visible) return;

	events.push(new EventMouseWheel([e.deltaX, e.deltaY]));
});
