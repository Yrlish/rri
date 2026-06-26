import { ROUNDS, createDice } from "../rules.js";

import HTMLDice from "./html-dice.js";
import Game from "./game.js";
import SandboxRound from "./round-sandbox.js";
import Board from "./board-canvas.js";
import * as scoreTable from "./score-table.js";
import { SandboxBonusPool } from "./pool.js";
import * as html from "./html.js";


export default class SandboxGame extends Game {
	_bonusPool = new SandboxBonusPool();
	_endGameButton: HTMLButtonElement = html.node("button");
	_shouldEndGame = false;
	_currentRoundResolve: (() => void) | null = null;

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
		
		// Insert the end game button after the bonus pool
		this._node.appendChild(this._endGameButton);

		let num = 1;
		// Sandbox mode runs for a large number of rounds (effectively unlimited)
		while (num <= ROUNDS["sandbox"] && !this._shouldEndGame) {
			let round = new SandboxRound(num, this._board, this._bonusPool);
			this._node.insertBefore(round.node, this._endGameButton);
			let dice = createDice(HTMLDice, "sandbox", num);
			
			// Set up a promise that can be resolved when end game is clicked
			const roundPromise = new Promise<void>(resolve => {
				this._currentRoundResolve = () => {
					resolve();
				};
			});
			
			// Add event listener to end game button for this round
			const endGameClickHandler = () => {
				this._shouldEndGame = true;
				if (this._currentRoundResolve) {
					this._currentRoundResolve();
				}
			};
			this._endGameButton.addEventListener("click", endGameClickHandler, { once: true });
			
			// Start the round
			const roundPlayPromise = round.play(dice);
			
			// Wait for either the round to complete or the end game button to be clicked
			await Promise.race([
				roundPlayPromise,
				roundPromise
			]);
			
			// Clean up
			this._endGameButton.removeEventListener("click", endGameClickHandler);
			this._currentRoundResolve = null;
			
			round.node.remove();
			
			// Only increment round number if we didn't end the game
			if (!this._shouldEndGame) {
				num++;
			}
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
}
