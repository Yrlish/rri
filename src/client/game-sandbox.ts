import { ROUNDS, createDice } from "../rules.js";

import HTMLDice from "./html-dice.js";
import Game from "./game.js";
import SandboxRound from "./round-sandbox.js";
import Board from "./board-canvas.js";
import * as scoreTable from "./score-table.js";
import { SandboxBonusPool } from "./pool.js";


export default class SandboxGame extends Game {
	_bonusPool = new SandboxBonusPool();

	constructor(_board:Board) {
		super(_board);
	}

	async play() {
		super.play();
		this._node.innerHTML = "";
		this._node.appendChild(this._bonusPool.node);

		let num = 1;
		// Sandbox mode runs for a large number of rounds (effectively unlimited)
		while (num <= ROUNDS["sandbox"]) {
			let round = new SandboxRound(num, this._board, this._bonusPool);
			this._node.appendChild(round.node);
			let dice = createDice(HTMLDice, "sandbox", num);
			await round.play(dice);
			round.node.remove();
			num++;
		}

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
