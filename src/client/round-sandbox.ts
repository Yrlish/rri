import Board from "../board.js";
import { Cell } from "../cell-repo.js";
import Tile from "../tile.js";

import Pool, { BonusPool } from "./pool.js";
import * as html from "./html.js";
import { DBLCLICK } from "./conf.js";
import HTMLDice from "./html-dice.js";
import { createDice } from "../rules.js";


export default class SandboxRound {
	node: HTMLElement;
	_pending: HTMLDice | null = null;
	_pool: Pool;
	_endButton: HTMLButtonElement = html.node("button");
	_rerollButton: HTMLButtonElement = html.node("button");
	_placedDice = new Map<Cell, HTMLDice>();
	_lastClickTs = 0;
	_mandatoryCount = 5;

	constructor(readonly number: number, readonly _board: Board, readonly _bonusPool: BonusPool) {
		this._pool = new Pool(`Round #${this.number} - Sandbox Mode`);
		this.node = this._pool.node;

		this._endButton.textContent = `End round #${this.number}`;
		this._rerollButton.textContent = "Reroll unplaced dice";
		this._rerollButton.style.marginLeft = "10px";
	}

	play(dice: HTMLDice[]) {
		dice.forEach(dice => this._pool.add(dice))
		this.node.appendChild(this._endButton);
		this.node.appendChild(this._rerollButton);

		this._pool.onClick = dice => this._onPoolClick(dice);
		this._bonusPool.onClick = dice => this._onPoolClick(dice);
		this._board.onClick = cell => this._onBoardClick(cell);

		this._syncEnd();
		this._bonusPool.unlock();

		return new Promise(resolve => {
			this._endButton.addEventListener("click", _ => {
				let valid = this._validatePlacement();
				if (!valid) {
					alert("You must place all 5 mandatory dice before ending the round.");
					return;
				}
				this._end();
				resolve();
			});

			this._rerollButton.addEventListener("click", _ => {
				this._rerollUnplaced();
			});
		});
	}

	_end() {
		this._board.commit(this.number);

		function noop() {};
		this._pool.onClick = noop;
		this._bonusPool.onClick = noop;
		this._board.onClick = noop;
	}

	_onPoolClick(dice: HTMLDice) {
		if (this._pending == dice) {
			this._pending = null;
			this._board.signal([]);
			this._pool.pending(null);
			this._bonusPool.pending(null);
		} else {
			this._pending = dice;
			// In sandbox mode, all empty cells are available
			let available = this._getAllEmptyCells();
			this._board.signal(available);
			this._pool.pending(dice);
			this._bonusPool.pending(dice);
		}
	}

	_onBoardClick(cell: Cell) {
		const ts = Date.now();
		if (ts-this._lastClickTs < DBLCLICK) {
			this._tryToRemove(cell);
		} else if (this._pending) {
			this._tryToAdd(cell);
		} else {
			this._tryToCycle(cell);
			this._lastClickTs = ts;
		}
	}

	_tryToRemove(cell: Cell) {
		let dice = this._placedDice.get(cell);
		if (!dice) { return; }

		this._placedDice.delete(cell);
		this._board.place(null, cell.x, cell.y, 0);

		this._pool.enable(dice);
		this._bonusPool.enable(dice);

		this._syncEnd();
	}

	_tryToAdd(cell: Cell) {
		if (!this._pending) { return; }

		// In sandbox mode, we can place anywhere on empty cells
		if (cell.border || cell.tile) { return false; }

		const x = cell.x;
		const y = cell.y;
		
		// Place with transform 0 (default)
		this._board.place(this._pending.tile.clone(), x, y, this.number);
		this._board.signal([]);

		this._pool.pending(null);
		this._bonusPool.pending(null);

		this._pool.disable(this._pending);
		this._bonusPool.disable(this._pending);

		this._placedDice.set(cell, this._pending);
		this._pending = null;
		this._syncEnd();
	}

	_tryToCycle(cell: Cell) {
		if (!this._placedDice.has(cell)) { return; }

		this._board.cycleTransform(cell.x, cell.y);
		this._syncEnd();
	}

	_syncEnd() {
		this._pool.syncSandbox(this._board);
		let remainingMandatory = this._getRemainingMandatoryCount();
		this._endButton.disabled = (remainingMandatory > 0);
	}

	_getRemainingMandatoryCount(): number {
		// Count how many mandatory dice are still in the pool (not placed)
		let placedMandatory = 0;
		for (let dice of this._placedDice.values()) {
			if (dice.mandatory) {
				placedMandatory++;
			}
		}
		return this._mandatoryCount - placedMandatory;
	}

	_getAllEmptyCells(): Cell[] {
		// Return all non-border cells that don't have a tile
		return this._board._cells.filter(cell => {
			return !cell.border && !cell.tile;
		});
	}

	_validatePlacement() {
		// In sandbox mode, we just need to have placed all mandatory dice
		let placedMandatory = 0;
		for (let dice of this._placedDice.values()) {
			if (dice.mandatory) {
				placedMandatory++;
			}
		}
		return placedMandatory >= this._mandatoryCount;
	}

	_rerollUnplaced() {
		// Find all unplaced mandatory dice and replace them with new random ones
		let unplacedMandatory = this._pool._dices.filter(dice => {
			return dice.mandatory && !dice.disabled && !dice.blocked;
		});
		
		if (unplacedMandatory.length === 0) {
			alert("All mandatory dice have been placed!");
			return;
		}

		// Remove old unplaced mandatory dice from pool
		unplacedMandatory.forEach(dice => {
			this._pool.node.removeChild(dice.node);
			let index = this._pool._dices.indexOf(dice);
			if (index > -1) {
				this._pool._dices.splice(index, 1);
			}
		});

		// Create new random dice
		let newDice = createDice(HTMLDice, "sandbox", this.number);
		
		// Add them to the pool
		newDice.forEach(dice => this._pool.add(dice));

		// Update the pool display
		this._syncEnd();
	}
}
