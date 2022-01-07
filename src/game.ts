import _words from "/src/powerlanguage.5.txt?raw";
import seedrandom from "seedrandom";
import { customElement, property } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import "./word.js";
import { Word } from "./word.js";
import "./keyboard.js";
import { Keyboard } from "./keyboard.js";

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

      div.words > v-word:not(.attempted) {
        opacity: 33%;
      }

      div.end {
        display: none; /* TODO: */
      }
    `;
  }

  @property({ reflect: true })
  seed = "plagiarism"; //Array.from(self.crypto.getRandomValues(new Uint32Array(1))).join("");
  @property({ reflect: true })
  attemptsLimit = 6;

  attempt = "";

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
    (this.shadowRoot?.querySelector("v-keyboard") as Keyboard)?.reset();
    this.requestUpdate();
  }

  makeAttempt(attempt: string, submit = false) {
    // If the game is over, abort
    if (this.#end) return;

    // Clean the attmpted word
    const attempt_ = Word.validateWord(attempt)
      .slice(0, this.#word.length);

    // If it's redundant, abort
    if (this.#attempts.includes(attempt_)) return;

    // Check if attempts is a valid dictionary word
    const valid = WORDS.includes(attempt_);

    // Set the index of the attempt
    const index = this.#attempts.length;

    // If a valid submission, accept it
    if (valid && submit) {
      this.#attempts.push(attempt_);
      if (this.#attempts.length >= this.attemptsLimit) this.#end = true;
      if (attempt_ === this.#word) {
        this.#end = true;
        this.#win = true;
      }
      // TODO: persist attempts to localstorage
    }

    console.log(attempt_);

    // Reflect the attempt to the UI
    this.#data[index] = attempt_
      .padEnd(this.#word.length, " ")
      .split("")
      .map((
        letter,
        i,
      ) => ({
        letter: !submit ? letter : valid ? letter : " ",
        state: !submit
          ? letter === " " ? "blank" : "key"
          : !valid
          ? "blank"
          : this.#word[i] === letter
          ? "exact"
          : this.#word.includes(letter)
          ? "partial"
          : "wrong",
      }));
    if (valid && submit) {
      this.#data[index].forEach(({ letter, state }) =>
        (this.shadowRoot?.querySelector("v-keyboard") as Keyboard)?.setKey(
          letter,
          state,
        )
      );
    }
    this.requestUpdate();
  }

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    this.#generateGame();
    addEventListener("keyup", ({ key }) => {
      switch (key) {
        case "Enter":
          this.makeAttempt(this.attempt, true);
          this.attempt = "";
          break;
        case "Backspace":
          this.attempt = this.attempt.slice(0, -1);
          this.makeAttempt(this.attempt);
          break;
        default:
          const letter = key.toLowerCase().match(/^[a-z]$/)?.[0] ?? "";
          if (letter) {
            this.attempt += letter;
            this.makeAttempt(this.attempt);
          }
          break;
      }
    });
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
      attempt: this.attempt,
      attempts: this.#attempts,
      data: this.#data,
    });
    //TODO: game end and sharing
    return html` 
      <div class="words ${this.#end ? "ended" : ""}">
        ${
      this.#data.map((data, i) =>
        html`<v-word .data=${data} class="${
          i <= (this.#end
              ? this.#attempts.length - 1
              : this.#attempts.length)
            ? "attempted"
            : ""
        }"></v-word>`
      )
    }
      </div> 
      ${
      this.#end
        ? html`<div class="end">
        ${this.#win ? "Congratulations!" : "Boo!!"}
      </div>`
        : ""
    }
      <v-keyboard></v-keyboard>`;
  }
}
