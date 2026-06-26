import { ROUNDS, createDice } from "../rules.js";

import HTMLDice from "./html-dice.js";
import Game from "./game.js";
import SandboxRound from "./round-sandbox.js";
import Board from "./board-canvas.js";
import * as scoreTable from "./score-table.js";
import { SandboxBonusPool } from "./pool.js";
import * as html from "./html.js";
import { Cell } from "../cell-repo.js";


export default class SandboxGame extends Game {
	_bonusPool = new SandboxBonusPool();
	_endGameButton: HTMLButtonElement = html.node("button");
	_shouldEndGame = false;

	constructor(_board:Board) {
		super(_board);
	}

	async play() {
		super.play();
		this._node.innerHTML = "";
		this._node.appendChild(this._bonusPool.node);

		// Add end game button below the board
		this._endGameButton.textContent = "End Game";
		this._endGameButton.style.marginTop = "10px";
		this._endGameButton.style.display = "block";
		this._endGameButton.style.marginLeft = "auto";
		this._endGameButton.style.marginRight = "auto";
		
		// Add event listener to end game button
		this._endGameButton.addEventListener("click", () => {
			this._shouldEndGame = true;
		});
		
		// Insert the end game button after the bonus pool
		this._node.appendChild(this._endGameButton);

		let num = 1;
		// Sandbox mode runs for a large number of rounds (effectively unlimited)
		while (num <= ROUNDS["sandbox"] && !this._shouldEndGame) {
			let round = new SandboxRound(num, this._board, this._bonusPool);
			this._node.insertBefore(round.node, this._endGameButton);
			let dice = createDice(HTMLDice, "sandbox", num);
			await round.play(dice);
			round.node.remove();
			
			// Check if board is full after each round
			if (this._isBoardFull()) {
				break;
			}
			
			num++;
		}

		this._endGameButton.remove();
		this._outro();

		return true;
	}

	_outro() {
		super._outro();

		let s = this._board.getScore();
		this._board.showScore(s);

		const parent = document.querySelector("#score") as HTMLElement;
		parent.innerHTML = "";
		parent.appendChild(scoreTable.renderSingle(s));
	}

	_isBoardFull(): boolean {
		// Check if all non-border cells have tiles
		// Use the filter method of CellRepo to get all non-border cells
		const nonBorderCells = this._board._cells.filter((cell: Cell) => !cell.border);
		
		for (let cell of nonBorderCells) {
			// If a non-border cell doesn't have a tile, board is not full
			if (!cell.tile) {
				return false;
			}
		}
		return true;
	}
}
