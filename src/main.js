import * as sound from "./sound.js";
import * as menu from "./menu.js";
import { canvas, ctx } from "./gfx.js";

let width, height;

function img(path) {
	const img = new Image();
	img.src = path;

	return img;
}

function moveTowards(from, to, step) {
	if (from < to) return Math.min(from + step, to);
	if (from > to) return Math.max(from - step, to);
	return to;
}

function angleWrap(angle) {
	const tau = Math.PI * 2;
	return ((angle + Math.PI) % tau + tau) % tau - Math.PI;
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

class BoardEntity {
	constructor(board, relativePos, radius) {
		this.board = board;
		this.relativePos = relativePos;
		this.pos = [0, 0];

		this.radius = radius;

		this.dead = false;
	}

	update(delta) {
		if (this.health <= 0) this.dead = true;
		this.pos = this.board.cellToGlobal(this.relativePos);
	}

	drawHealthbar() {
		if (!this.maxHealth) return;

		ctx.save();
		ctx.translate(this.pos[0], this.pos[1] - this.radius * this.board.cell_size);
		
		for (let i = 0; i < this.maxHealth; i++) {
			const x = (i - this.maxHealth * 0.5 + 0.5) * 12;

			const frac = Math.max(0, Math.min(1, this.health - i));

			ctx.fillStyle = "#F35";
			ctx.fillRect(x - 5, -5, 10, 5);

			if (frac == 0) {
				continue;
			}

			ctx.fillStyle = "#3F3";
			ctx.fillRect(x - 5, -5, 10 * frac, 5);
		}

		ctx.restore();
	}

	playSound(sound, gain) {
		let distance = this.pos[0] - (width / 2);

		let pan = Math.max(-1, Math.min(1, distance / 600));
		gain /= Math.hypot(1, distance / 800);

		sound.play(gain, pan);

	}
}

// extends entity haha this is fine :sunglasses:
// this is definitely for javascript JIT shape optimization and definitely not because i am very lazy
class ShockEffect extends BoardEntity {
	constructor(board, relativePos, radius) {
		super(board, relativePos, radius);

		this.time = 0;
	}

	update(delta) {
		super.update(delta);

		this.time += delta * 2;
		if (this.time > 1) this.dead = true;
	}

	draw() {
		const radfrac = 1.0 - Math.pow(1.0 - this.time, 6.0);
		const line_width = Math.pow(1.0 - this.time, 2.0);
		const fill_alpha = (1.0 - Math.pow(this.time, 2.0)) * 0.5;
		ctx.beginPath();
		ctx.arc(...this.pos, this.radius * this.board.cell_size * radfrac, 0, Math.PI * 2);

		ctx.strokeStyle = "rgb(255, 60, 0)";
		ctx.lineWidth = line_width * 40.0;
		ctx.stroke();



		ctx.fillStyle = `rgba(255, 60, 0, ${fill_alpha * 100}%)`;
		ctx.fill();
	}
}

class BuildableReturnEffect extends BoardEntity {
	constructor(board, relativePos) {
		super(board, relativePos);

		this.time = 0;

		this.radius = 2;
	}

	update(delta) {
		super.update(delta);

		this.time += delta * 2;
		if (this.time > 1) this.dead = true;
	}

	draw() {
		const radfrac = 1.0 - Math.pow(1.0 - this.time, 6.0);
		const line_width = Math.pow(1.0 - this.time, 2.0);
		const fill_alpha = (1.0 - Math.pow(this.time, 2.0)) * 0.5;
		ctx.beginPath();
		ctx.arc(...this.pos, this.radius * this.board.cell_size * radfrac, 0, Math.PI * 2);

		ctx.strokeStyle = "rgb(0, 220, 255)";
		ctx.lineWidth = line_width * 40.0;
		ctx.stroke();



		ctx.fillStyle = `rgba(0, 220, 255, ${fill_alpha * 100}%)`;
		ctx.fill();
	}
}

class BannerEffect {
	constructor(board, text) {
		this.board = board;

		this.pos = [0, 0];
		this.text = text;

		this.pos = [0, 0];
	}

	update(delta) {
		this.pos = this.board.pos;
	}

	draw() {
		ctx.save();
		ctx.translate(...this.pos);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "Bold 30px sans";
		ctx.fillStyle = "#FFF";

		ctx.fillText(this.text, 0, 0);
		ctx.restore();
	}
}

class Turret extends BoardEntity {
	constructor(board, proto, relativePos, rotation) {
		super(board, relativePos, 0.5);

		this.proto = proto;
		this.rotation = rotation;

		this.refire = 0;

		this.onGrid = true;

		this.health = 3;
		this.maxHealth = 3;

		this.team = 2;
	}

	update(delta) {
		super.update(delta);
		this.refire -= delta;
	}

	draw() {
		drawImage(this.proto.image, [0.5, 0.5], this.pos, this.rotation * Math.PI * 0.5);
	}
}

class Bullet extends BoardEntity {
	constructor(board, relativePos, angle, speed) {
		super(board, relativePos, 0.05);

		this.velocity = [
			Math.sin(angle) * speed,
			-Math.cos(angle) * speed,
		];
		this.angle = angle;

		this.oob_timer = 0;

		this.damage = 1;
	}

	update(delta) {
		for (const entity of this.board.entitiesNear(this.relativePos, this.radius)) {
			// Entities without health (bullet) cannot collide
			if (entity === this || !this.canTarget(entity) || !entity.health) continue;

			if (entity.health) {
				entity.health -= this.damage;
			}

			this.dead = true;
		}
		

		this.relativePos[0] += this.velocity[0] * delta;
		this.relativePos[1] += this.velocity[1] * delta;
		const cell = this.board.cell(this.relativePos);
		if (!cell) {
			this.oob_timer += delta;
			if (this.oob_timer > 0.2) {
				this.dead = true;
				return;
			}
		} else if (!cell.backing.fliable) {
			this.dead = true;
		}

		super.update(delta);
	}
}

class RepeaterBullet extends Bullet {
	constructor(board, proto, controller, relativePos, angle) {
		super(board, relativePos, angle, 4.0);

		this.proto = proto;
		this.controller = controller;
	}

	canTarget(ent) {
		return ent !== this.controller;
	}

	update(delta) {
		super.update(delta);

		this.pos = this.board.cellToGlobal(this.relativePos);
	}

	draw() {
		drawImage(this.proto.image_bullet, [0.5, 0.5], this.pos, this.angle);
	}
}

class RepeaterTurret extends Turret {
	constructor(board, proto, relativePos, rotation) {
		super(board, proto, relativePos, rotation);

		this.punch = new Smooth(0);
	}

	update(delta) {
		super.update(delta);
		if (this.refire < 0) {
			this.refire += 0.7;
			if (this.refire < 0) this.refire = 0;

			const angle = this.rotation * Math.PI * 0.5;

			this.board.spawn(new RepeaterBullet(this.board, this.proto, this, [...this.relativePos], angle));

			this.punch.velocity = -5.0;

		}

		this.punch.tick(delta, 0, 100.0, 18.0);
	}

	draw() {
		drawImage(this.proto.image, [0.5, 0.5], this.pos, this.rotation * Math.PI * 0.5);
		drawImage(this.proto.image_barrel, [0.5, this.punch + 0.5], this.pos, this.rotation * Math.PI * 0.5);
	}
}

class ShockwaveTurret extends Turret {
	constructor(board, proto, relativePos, rotation) {
		super(board, proto, relativePos, rotation);

		this.refire = 0.5;

		this.refire_time = 2.0;

		this.health = 4;
		this.maxHealth = 4;
	}

	update(delta) {
		super.update(delta);

		if (this.refire < 0) {
			this.refire += this.refire_time;
			if (this.refire < 0) this.refire = 0;

			for (const ent of this.board.entitiesNear(this.relativePos, 1.6)) {
				if (ent === this) continue;
				if (ent.health) {
					ent.health -= 1.5;
				}
			}

			this.board.effects.push(new ShockEffect(this.board, this.relativePos, 1.6));

			this.playSound(this.proto.sound, 1.0);
		}
	}

	draw() {
		ctx.save();
		ctx.translate(...this.pos);

		const frac = (this.refire / this.refire_time);

		let barrel_rot = Math.pow(1.0 - frac, 8) * 10.0;
		barrel_rot += this.refire * 2.0;

		let barrel_scale = Math.pow(1.0 - frac, 12.0) * 0.5 + 1.0;
		barrel_scale += Math.pow(frac, 12.0) * 0.5;

		drawImage(this.proto.image, [0.5, 0.5], [0.0, 0.0], 0);
		ctx.scale(barrel_scale, barrel_scale);
		drawImage(this.proto.image_barrel, [0.5, 0.5], [0.0, 0.0], barrel_rot);
		
		ctx.restore();
	}
}

const buildables = {
	repeater: {
		name: "Repeater Turret",
		hurtbox: img("assets/damageprojline.svg"),
		hurtboxAnchor: [0.5, 1.0],
		image: img("assets/turret-repeater.svg"),
		image_barrel: img("assets/turret-repeater-barrel.svg"),
		image_bullet: img("assets/repeater-bullet.svg"),
		cls: RepeaterTurret,

		rotatable: true,
	},
	shockwave: {
		name: "Shockwave Turret",
		hurtbox: img("assets/damageshock.svg"),
		hurtboxAnchor: [0.5, 0.5],
		image: img("assets/turret-shockwave.svg"),
		image_barrel: img("assets/turret-shockwave-barrel.svg"),
		cls: ShockwaveTurret,

		rotatable: false,

		sound: sound.load("sounds/shockwave.mp3"),
	},
};

// Make sure we can go back from built turret -> buildable later.
for (const key in buildables) {
	buildables[key].key = key;
}

class Enemy extends BoardEntity {
	constructor(board, relativePos, radius) {
		super(board, relativePos, radius);

		this.speed = 2;

		this.next_waypoint_index = 1;

		this.team = 1;

		this.angle_forwards = 0;
	}

	update(delta) {
		super.update(delta);

		const current_waypoint = this.board.enemyTrack[this.next_waypoint_index - 1]
		const next_waypoint = this.board.enemyTrack[this.next_waypoint_index];
		if (!next_waypoint) {
			this.dead = true; // :'(
			this.board.onLost();

			return;
		}

		const next_next_waypoint = this.board.enemyTrack[this.next_waypoint_index + 1] ?? [next_waypoint[0], next_waypoint[1] + 1];

		const vec = [
			next_waypoint[0] - current_waypoint[0],
			next_waypoint[1] - current_waypoint[1],
		];

		this.angle_forwards = Math.atan2(vec[0], -vec[1]);

		const next_angle_forwards = Math.atan2(
			next_next_waypoint[0] - next_waypoint[0],
			-(next_next_waypoint[1] - next_waypoint[1]),
		);

		const len = Math.hypot(vec[0], vec[1]);
		vec[0] /= len; vec[1] /= len;

		let movement_this_frame = this.speed * delta;
		const next_dot = next_waypoint[0] * vec[0] + next_waypoint[1] * vec[1];

		const here_dot = this.relativePos[0] * vec[0] + this.relativePos[1] * vec[1];

		const pending = next_dot - here_dot;

		if (pending < 0.3) {
			this.angle_forwards += angleWrap(next_angle_forwards - this.angle_forwards) * (1.0 - pending / 0.3);
		}

		if (movement_this_frame > pending) {
			movement_this_frame = pending;
			this.next_waypoint_index++;
		}

		this.relativePos[0] += vec[0] * movement_this_frame;
		this.relativePos[1] += vec[1] * movement_this_frame;
	}

	chooseTarget(radius) {
		// Don't let enemies do anything until they've properly found their place in the world.
		if (this.next_waypoint_index < 2) return null;

		let min_dist = 0;
		let min_ent = null;
		for (const ent of this.board.entitiesNear(this.relativePos, radius)) {
			if (!(ent instanceof Turret)) continue;

			const dist = Math.hypot(
				ent.relativePos[0] - this.relativePos[0],
				ent.relativePos[1] - this.relativePos[1],
			);

			if (dist < min_dist || !min_ent) {
				min_dist = dist;
				min_ent = ent;
			}
		}

		return min_ent;
	}
}

class EnemyNoop extends Enemy {
	constructor(board, relativePos) {
		super(board, relativePos, 0.3);

		this.speed = 1.2;

		this.health = 1;
		this.maxHealth = 1;

		this.flavor_spawn = [
			"ive been summoned by the WIZARD and i will DO NOTHING.",
		];

		this.flavor_die = [
			"ow my insides",
		];
	}

	update(delta) {
		super.update(delta);
	}

	draw() {
		ctx.save();
		ctx.translate(this.pos[0], this.pos[1]);
		ctx.beginPath();
		ctx.arc(0, 0, 10, 0, Math.PI * 2);

		ctx.fillStyle = "#28A";
		ctx.fill();
		ctx.restore();
	}
}

class GunnerBullet extends Bullet {
	constructor(board, relativePos, angle) {
		super(board, relativePos, angle, 8.0);

		this.damage = 0.15;
	}

	canTarget(ent) {
		return ent instanceof Turret;
	}

	update(delta) {
		super.update(delta);
	}

	draw() {
		ctx.save();
		ctx.translate(...this.pos);
		ctx.rotate(this.angle);

		ctx.fillStyle = "#FAA";
		ctx.fillRect(-2, -8, 4, 16);

		ctx.restore();
	}
}

class EnemyGunner extends Enemy {
	constructor(board, relativePos) {
		super(board, relativePos, 0.4);

		this.speed = 1.0;

		this.health = 2;
		this.maxHealth = 2;

		this.flavor_spawn = [
			"I’ve got more bullets than I can count, and that’s not saying much because I can’t count!",
		];

		this.flavor_die = [
			"Remember my name!",
			"No...",
		];

		this.angle_smooth = new SmoothAngle(0);

		this.refire = 0;
	}

	update(delta) {
		super.update(delta);

		const target = this.chooseTarget(3);

		this.refire -= delta;
		if (target) {
			const angle = Math.atan2(
				target.relativePos[0] - this.relativePos[0],
				-(target.relativePos[1] - this.relativePos[1]),
			);
			this.angle_smooth.tick(delta, angle, 100.0, 25.0);

			// Enemies don't deserve proper delta handling.
			if (this.refire < 0.0) {
				this.refire = 1;

				this.board.spawn(new GunnerBullet(this.board, [...this.relativePos], angle));
			}
		} else {
			this.angle_smooth.tick(delta, this.angle_forwards, 100.0, 25.0);
		}
	}

	draw() {
		ctx.save();
		ctx.translate(this.pos[0], this.pos[1]);
		ctx.rotate(this.angle_smooth);
		ctx.beginPath();

		ctx.moveTo(0, -15);
		ctx.lineTo(-8, 5);
		ctx.lineTo(0, 2);
		ctx.lineTo(8, 5);

		ctx.closePath();
		
		ctx.fillStyle = "#FD6";
		ctx.lineWidth = 2;
		ctx.fill();
		ctx.restore();
	}
}

class GridCell {
	constructor() {
		// Flyweighted to `cellTypes`
		this.backing = cellTypes.empty;
		this.entity = null;

		this.onTrack = false;
	}

	buildable() {
		return !this.entity && this.backing.buildable && !this.onTrack;
	}
}

class Board {
	constructor(game, animation, animation_time) {
		this.pos = [0, 0];
		this.game = game;

		this.width = 6;
		this.height = 8;
		this.grid = [];

		this.animation = animation;
		this.animation_time = animation_time;

		for (let x = 0; x < this.width; x++) {
			this.grid.push([]);
			for (let y = 0; y < this.height; y++) {
				this.grid[x].push(new GridCell(cellTypes.empty));
			}
		}

		this.cell_size = 64;

		this.entities = [];
		this.effects = [];

		this.enemyTrack = [];

		const trackTemperature = Math.random() * 0.8 + 0.2;

		let previous_x = Math.floor(Math.random() * this.width);

		// `enemyTrack` goes from top to bottom.
		for (let y = 0; y <= this.height; y++) {
			let x = previous_x;
			
			if (y >= 2 && y <= this.height - 1) {
				if (Math.random() > trackTemperature) {
					x += Math.round((Math.random() * 6 - 3) * trackTemperature)
					x = Math.max(0, Math.min(this.width - 1, x));
				} else {
					x = Math.floor(Math.random() * this.width);
				}
			}

			if (y > 0 && x != previous_x) {
				for (let path_x = moveTowards(previous_x, x, 1);; path_x = moveTowards(path_x, x, 1)) {
					this.enemyTrack.push([path_x, y - 1]);

					if (path_x === x) break;
				}
			}

			if (y == 0) {
				this.enemyTrack.push([x, y - 1]);
			}
			this.enemyTrack.push([x, y]);

			previous_x = x;
		}

		for (const item of this.enemyTrack) {
			const cell = this.cell(item);
			if (!cell) continue;

			cell.onTrack = true;
		}

		const fillProb = Math.random() * 0.4;

		for (let x = 0; x < this.width; x++) {
			for (let y = 0; y < this.height; y++) {
				if (this.grid[x][y].onTrack) continue;
				if (Math.random() < fillProb) {
					this.grid[x][y].backing = cellTypes.mountain;
				}
			}
		}

		this.enemies_to_spawn = [];
		this.enemy_spawn_timer = 0;

		let spawn_time = 3 - animation_time;

		const waves = Math.random() * 3 + 2;

		const enemies = [EnemyNoop, EnemyGunner];

		for (let i = 0; i < waves; i++) {
			const count = Math.random() * 3 + 1;
			const cls = enemies[Math.floor(Math.random() * enemies.length)];
			for (let i = 0; i < count; i++) {
				this.enemies_to_spawn.push({
					ent: new cls(this, [...this.enemyTrack[0]]),
					time: spawn_time,
				});

				spawn_time += 0.5;
			}

			spawn_time += 3;
		}
		// for (let i = 0; i < 6; i++) {
		// 	this.enemies_to_spawn.push({
		// 		ent: new EnemyGunner(this, [...this.enemyTrack[0]]),
		// 		time: i * 1,
		// 	});
		// }

		// for (let i = 0; i < 10; i++) {
		// 	this.enemies_to_spawn.push({
		// 		ent: new EnemyNoop(this, [...this.enemyTrack[0]]),
		// 		time: i * 0.5 + 8,
		// 	});
		// }

		// Reversed, we're going to spawn enemies going from the *end* to avoid needless copying (when popping from the front.)
		this.enemies_to_spawn.sort((a, b) => b.time - a.time);

		this.game_over = false;
		this.game_over_time = 0;

		this.background_image = img("assets/board.svg");

		// Set from `update`, used from `draw`.
		this.fade = 0;
	}

	spawn(ent) {
		this.entities.push(ent);

		if (ent.onGrid) {
			this.cell(ent.relativePos).entity = ent;
		}
	}

	update(delta) {
		const fade_time = 1;

		if (this.animation_time < fade_time) {
			let fraction = Math.max(0, Math.min(1, this.animation_time / fade_time));
			if (this.animation[1] === "out") {
				fraction = 1 - fraction;
			}
			let offset = Math.pow(1.0 - fraction, 2) * 300;
			this.fade = fraction;

			let sign;
			if (this.animation[0] === "up") {
				sign = -1;
			} else {
				sign = 1;
			}

			if (this.animation[1] === "out") {
				sign *= -1;
			}

			this.pos[1] += offset * sign;

			this.animation_time += delta;
		} else {
			this.fade = 1;
		}

		// Important to do this first, as otherwise if there's a single enemy, there's a one frame gap between it spawning -> it registering on the `has_enemies` scale.
		const last_enemy = () => this.enemies_to_spawn[this.enemies_to_spawn.length - 1];

		while (this.enemies_to_spawn.length > 0 && this.enemy_spawn_timer > last_enemy().time) {
			const { ent } = this.enemies_to_spawn.pop();
			this.spawn(ent);
		}

		this.enemy_spawn_timer += delta;

		let has_enemies = false;
		for (let i = 0; i < this.entities.length; i++) {
			const ent = this.entities[i];

			if (ent instanceof Enemy) {
				has_enemies = true;
			}

			ent.update(delta);
			if (ent.dead) {
				if (ent.onGrid) {
					const cell = this.cell(ent.relativePos);
					
					if (cell.entity === ent) cell.entity = null;
				}
				this.entities.splice(i, 1);
				i--;
				continue;
			}
		}

		for (let i = 0; i < this.effects.length; i++) {
			this.effects[i].update(delta);

			if (this.effects[i].dead) {
				this.effects.splice(i, 1);
				i--;
				continue;
			}
		}

		if (this.enemies_to_spawn.length === 0 && !has_enemies && !this.game_over) {
			this.game_over = true;
			this.effects.push(new BannerEffect(this, "ARENA CLEARED!"));

			for (const entity of this.entities) {
				if (entity instanceof Turret) {
					this.effects.push(new BuildableReturnEffect(this, entity.relativePos));

					this.game.palette.stock(entity.proto.key);

					entity.dead = true;
				}
			}

			this.game.addToken();

			this.animation = ["up", "out"];
			this.animation_time = -3;
		}

		if (this.game_over) {
			this.game_over_time += delta / 4;
		}

	}

	onLost() {
		if (this.game_over) return;
		this.game_over = true;
		this.effects.push(new BannerEffect(this, "LOST"));

		this.game.removeToken();

		this.animation = ["down", "out"];
		this.animation_time = -3;
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
		ctx.save();

		this.clip();

		ctx.fillStyle = "#010915";
		ctx.fillRect(
			this.pos[0] - this.width * this.cell_size * 0.5,
			this.pos[1] - this.height * this.cell_size * 0.5,
			this.width * this.cell_size,
			this.height * this.cell_size,
		);

		ctx.beginPath();
		ctx.moveTo(...this.cellToGlobal(this.enemyTrack[0]));
		for (const pos of this.enemyTrack) {
			ctx.lineTo(...this.cellToGlobal(pos));
		}
		ctx.strokeStyle = "#840";
		ctx.lineWidth = 40;
		ctx.lineJoin = "round";
		ctx.stroke();

		ctx.strokeStyle = "#010915";
		ctx.lineWidth = 36;
		ctx.stroke();

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

		// Everything else is outside of our clip.
		ctx.restore();

		// Draw healthbars on a separate layer.
		for (const entity of this.entities) {
			entity.drawHealthbar();
		}

		drawImage(this.background_image, [0.5, 0.5], this.pos, 0);

		for (const effect of this.effects) {
			effect.draw();
		}

		if (this.fade < 1) {
			const margin = 10;
			ctx.fillStyle = `rgba(0, 0, 0, ${(1.0 - this.fade) * 100}%)`;
			ctx.fillRect(
				this.pos[0] - this.width * this.cell_size * 0.5 - margin,
				this.pos[1] - this.height * this.cell_size * 0.5 - margin,
				this.width * this.cell_size + margin * 2,
				this.height * this.cell_size + margin * 2,
			);
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
		this.value = target + angleWrap(this.value - target);
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

		this.count_pop = 0;
	}

	update(delta) {

		this.count_pop = Math.max(0, this.count_pop - delta * 2);

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

				this.dragPos.set([this.pos[0], this.pos[1] - 60]);
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
			for (const board of game.board_slots) {
				if (!board) continue;

				this.dragBoard = board;
				this.dragBoardCell = this.dragBoard?.globalToCell?.(mouse_position);

				if (this.dragBoardCell) break;
			}

			if (this.dragBoardCell) {
				const cell = this.dragBoard.cell(this.dragBoardCell);
				if (!cell.buildable() || this.dragBoard.game_over
					|| (this.dragBoardCell[1] < 1 || this.dragBoardCell[1] >= this.dragBoard.height - 1)) {
					this.dragBoardCell = null;
				}
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
		if (!cell.buildable()) return;

		const buildable = buildables[this.item];

		const entity = new buildable.cls(this.dragBoard, buildable, this.dragBoardCell, this.rotation);

		this.dragBoard.spawn(entity);

		this.count--;

		this.popup.value = -100;
		this.popup.velocity = 200;
	}

	draw() {
		let [x, y] = this.pos;
		y -= this.popup;

		ctx.fillStyle = "#FFF";
		ctx.textAlign = "center";

		const count = this.count - (this.dragging ? 1 : 0);

		const buildable = buildables[this.item];

		ctx.save();
		if (count == 0) {
			ctx.globalAlpha = 0.5;
		}

		const count_size = 20 + (1.0 - Math.pow(1.0 - this.count_pop, 2.0)) * 60;

		ctx.font = `Bold ${count_size}px sans`;
		ctx.fillText(this.count - (this.dragging ? 1 : 0), x, y - 80);

		if (!this.dragging) {
			drawImage(buildable.image, [0.5, 0.5], [x, y - 40], 0);
			drawImage(buildable.image_barrel, [0.5, 0.5], [x, y - 40], 0);
		}
		// drawImage(buildable.hurtbox, buildable.hurtboxAnchor, [x, y - 40], 0);

		ctx.globalAlpha = 1.0;


		if (this.dragging) {
			drawImage(buildable.image, [0.5, 0.5], this.dragPos, this.dragAngle);
			drawImage(buildable.image_barrel, [0.5, 0.5], this.dragPos, this.dragAngle);

			if (this.dragBoard && this.dragBoardCell) {
				// this.dragBoard.clip();
				drawImage(buildable.hurtbox, buildable.hurtboxAnchor, this.dragPos, this.dragAngle);
			}
		}

		ctx.restore();
	}
}

class Palette {
	constructor() {
		this.deck = [
			new PaletteEntry("repeater", 6),
			new PaletteEntry("shockwave", 4),
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

	stock(buildable) {
		for (const item of this.deck) {
			if (item.item !== buildable) {
				continue;
			}

			item.count++;
			item.count_pop = 1;
			return;
		}

		console.assert(false, "stock() stocked an item not in palette");
	}
}

class Game {
	constructor() {
		this.palette = new Palette();
		this.board_slots = [
			new Board(this, ["down", "in"], 0),
			new Board(this, ["up", "in"], -0.3),
			new Board(this, ["down", "in"], -0.6),
		];
		this.boards_pan = new Smooth(0);
		this.panning = false;

		this.hover = false;

		this.tokens = 5;
		this.max_tokens = 5;

		this.token_timers = [];
		for (let i = 0; i < this.max_tokens; i++) {
			this.token_timers.push({sign: 1, time: 99});
		}

		this.token_image = img("assets/token-held.svg");
		this.token_image_outline = img("assets/token-outline.svg");

		this.score = 0;
	}

	addScore(count) {
		if (this.tokens <= 0) return;
		this.score += count;
	}

	addToken() {
		// Don't let tokens go above zero again.
		if (this.tokens <= 0 || this.tokens >= this.max_tokens) return;

		this.token_timers[this.tokens] = {
			sign: 1,
			time: 0,
		};
		this.tokens++;
	}

	removeToken() {
		if (this.tokens <= 0) return;

		this.tokens--;
		this.token_timers[this.tokens] = {
			sign: -1,
			time: 0,
		};
	}

	// `update` things in the opposite order from drawing them, so the events of things drawn higher in Z-order (later in `draw`) are processed first (earlier in `update`)
	update(delta) {
		this.palette.pos = [width / 2, height];
		this.palette.update(delta);

		const board_width = 6 * 64;
		const board_height = 8 * 64;

		const board_spacing = board_width + 100;

		const max_pan = board_spacing * (this.board_slots.length - 1);

		if (!this.panning) {
			if (this.boards_pan.value < 0 || this.boards_pan.value > max_pan) {
				this.boards_pan.tick(delta, Math.max(0, Math.min(max_pan, this.boards_pan.value)), 200, 25);
			} else {
				this.boards_pan.tick(delta, this.boards_pan.value, 50, 5);
			}
	}

		let i = 0;
		for (let board of this.board_slots) {
			if (!board) {
				i++;
				continue;
			}

			if (board.game_over_time > 1) {
				// Play the same animation as the board we just replaced.
				this.board_slots[i] = new Board(this, [board.animation[0], "in"], 0);
				board = this.board_slots[i];
			}

			board.pos = [width / 2 + board_spacing * i - this.boards_pan, height / 2];
			board.update(delta);

			i++;
		}

		poll(this, (event) => {
			if ((this.panning || captured(this)) && (event === event_blur || !captured(this) || !this.panning)) {
				releaseCapture();
				this.panning = false;
				this.hover = false;
			}

			// @TODO remove before jam end!!!!!! (very important)
			if (event instanceof EventKeyDown) {
				if (event.key === "F2") this.addToken();
				if (event.key === "F3") this.removeToken();
				if (event.key === "F4") this.addScore(50823);
				if (event.key === "F5") this.board_slots[0].onLost();
			}

			if (event instanceof EventMouseMove) {
				if (this.panning) {
					this.boards_pan.value -= event.relative[0];
					this.boards_pan.velocity = -event.relative[0] / delta;
				}

				if (event.pos[1] > (height - board_height) / 2 &&
				event.pos[1] < (height + board_height) / 2) {
					this.hover = true;

					return event_blur;
				} else {
					this.hover = false;
				}
			}

			if (this.hover && !this.panning && event instanceof EventMouseDown && event.button == 0) {
				capture(this);
				this.panning = true;
			}

			if (this.panning && event instanceof EventMouseUp && event.button == 0) {
				this.panning = false;
				releaseCapture();
			}
		});

		if (this.hover) {
			cursor = "grab";
		}

		if (this.panning) {
			cursor = "grabbing";
		}

		for (const timer of this.token_timers) {
			timer.time += delta * 3;
			timer.time = Math.min(1, timer.time);
		}
	}

	draw() {
		for (const board of this.board_slots) {
			if (!board) continue;

			board.draw();
		}

		this.palette.draw();

		ctx.save();
		ctx.translate(width, 0);

		for (let i = 0; i < this.max_tokens; i++) {
			const timer = this.token_timers[i];

			ctx.save();
			ctx.translate(-40, 40);

			drawImage(this.token_image_outline, [0.5, 0.5], [0.0, 0.0], 0.0);

			if (timer.time < 1) {
				if (timer.sign < 0) {
					let s = 1.0 + (1.0 - Math.pow(1.0 - timer.time, 3)) * 0.2;
					ctx.scale(s, s);

					ctx.strokeStyle = "#F22";
					ctx.lineWidth = Math.pow(1.0 - timer.time, 2) * 20;
					const arc_size = 20 + (1.0 - Math.pow(1.0 - timer.time, 3.0)) * 20;
					ctx.beginPath();
					ctx.arc(0, 0, arc_size, 0, Math.PI * 2);
					ctx.stroke();
					ctx.globalAlpha = (1.0 - Math.pow(timer.time, 4)) * 0.8;
				}

				if (timer.sign > 0) {
					let s = 1 + (1.0 - (Math.pow(timer.time, 2)));
					s *= (1.0 - Math.pow(timer.time, 6)) * 0.4 + 1.0;
					ctx.scale(s, s);

					const wipe = 30 * ((1.0 - Math.pow(1.0 - timer.time, 3.0)) * 2 - 1);

					ctx.beginPath();
					ctx.moveTo(-80 + wipe, 80 + wipe);
					ctx.lineTo(80 + wipe, -80 + wipe);
					ctx.lineTo(0, -500);
					ctx.lineTo(-500, 0);
					ctx.closePath();
					ctx.clip();
				}
			}

			if (timer.time < 1 || i < this.tokens) {
				drawImage(this.token_image, [0.5, 0.5], [0.0, 0.0], 0.0);
			}

			ctx.restore();

			ctx.translate(-70, 0);
		}

		ctx.textAlign = "right";
		ctx.textBaseline = "middle";

		ctx.font = "Bold 30px sans";
		ctx.fillStyle = "#FFF";
		ctx.fillText(`${this.score.toLocaleString()}`, -25, 40);

		ctx.restore();

	}
}

const game = new Game();

function draw() {
	const dpr = window.devicePixelRatio ?? 1;

	width = canvas.width / dpr;
	height = canvas.height / dpr;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.save();
	ctx.scale(dpr, dpr);

	game.draw();
	ctx.restore();

}

let previous_frame = performance.now();

function tick(time) {
	let delta = (time - previous_frame) / 1000;
	if (delta > (1 / 30)) delta = (1 / 30);
	previous_frame = time;

	cursor = "default";
	event_capture_polled_this_frame = false;
	const was_captured = event_capture != null;

	game.update(menu.visible ? 0 : delta);

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
	if (!e.altKey && !e.ctrlKey && !e.metaKey) e.preventDefault();
});

window.addEventListener("mousewheel", (e) => {
	if (menu.visible) return;

	events.push(new EventMouseWheel([e.deltaX, e.deltaY]));
});

canvas.addEventListener("mouseout", () => {
	events.push(event_blur);
});
