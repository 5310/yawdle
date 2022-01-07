import _words from "/src/powerlanguage.5.txt?raw";
import seedrandom from "seedrandom";
import { customElement, property } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import "./word.js";
import { Word } from "./word.js";
import "./keyboard.js";

const WORDS = _words.trim().split("\n");

@customElement("v-game")
export class Game extends LitElement {
  static get styles() {
    return css`
      :host {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        padding: 1rem;
      }

      div {
        display: grid;
        grid-gap: 1rem;
      }
    `;
  }

  @property({ reflect: true })
  seed = "plagiarism"; //Array.from(self.crypto.getRandomValues(new Uint32Array(1))).join("");

  @property({ reflect: true })
  attemptsLimit = 6;

  #word = "";
  #attempts: string[] = [];
  #data: { letter: string; state: string }[][] = [];
  #end = false;
  #win = false;

  #generateGame() {
    //TODO: Encrypted attempts from share
    //TODO: Get seed from URL if any
    const prng = seedrandom(this.seed);
    const index = Math.floor(prng() * WORDS.length);
    this.#word = WORDS[index];
    console.log("Game generated with the word", this.#word);
    this.#data = Array(this.attemptsLimit).fill(0).map(() =>
      this.#word.split("").fill(" ").map((letter) => ({
        letter,
        state: "blank",
      }))
    );
    this.requestUpdate();
  }

  submitAttempt(attempt: string) {
    if (this.#end) return;
    const attempt_ = Word.validateWord(attempt).slice(0, this.#word.length);
    if (attempt_.length === this.#word.length) {
      if (this.#attempts.includes(attempt_)) return;
      else this.#attempts.push(attempt_);
      // TODO: persist attempts to localstorage
      this.#data[this.#attempts.length - 1] = attempt_.split("").map((
        letter,
        i,
      ) => ({
        letter,
        state: this.#word[i] === letter
          ? "exact"
          : this.#word.includes(letter)
          ? "partial"
          : "wrong",
      }));
      if (this.#attempts.length >= this.attemptsLimit) this.#end = true;
      if (attempt_ === this.#word) {
        this.#end = true;
        this.#win = true;
      }
      this.requestUpdate();
    }
  }

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    this.#generateGame();
  }

  attributeChangedCallback(
    name: string,
    _oldValue: unknown,
    newValue: unknown,
  ) {
    switch (name) {
      case "seed":
        this.seed = newValue as string;
        this.#generateGame();
        break;
    }
  }

  render() {
    console.log({
      word: this.#word,
      attempts: this.#attempts,
      data: this.#data,
    });
    //TODO: game end and sharing
    return html` <div>
      ${this.#data.map((data) => html`<v-word .data=${data}></v-word>`)}      
      </div> 
      <v-keyboard></v-keyboard>`;
  }
}
