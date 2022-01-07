import _words from "/src/powerlanguage.5.txt?raw";
import seedrandom from "seedrandom";
import { customElement } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import "./word.js";
import { Word } from "./word.js";
import "./keyboard.js";
import { Keyboard } from "./keyboard.js";

const WORDS = _words.trim().split("\n");

@customElement("yawdle-game")
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

      div.words > yawdle-word:not(.attempted) {
        opacity: 33%;
      }

      yawdle-keyboard {
        opacity: 75%;
      }
    `;
  }

  #seed = "plagiarism";
  #word = "";
  #attemptsLimit = 6;
  #attempts: string[] = [];
  #attempt = "";
  #ended = false;
  #success = false;
  #data: { letter: string; state: string }[][] = [];

  #generateGame() {
    // Get or generate seed
    const params = new URLSearchParams(location.search);
    this.#seed = params.get("seed") ??
      Array.from(self.crypto.getRandomValues(new Uint32Array(1))).join("");
    params.set("seed", this.#seed);
    window.history.replaceState({}, "", `${location.pathname}?${params}`);

    //TODO: Display encrypted attempts from shared link

    // Select a random word
    const prng = seedrandom(this.#seed);
    const index = Math.floor(prng() * WORDS.length);
    this.#word = WORDS[index];
    console.log("Game generated with the word", this.#word);

    // Reset the game
    this.#attempts = [];
    this.#attempt = "";
    this.#ended = false;
    this.#success = false;
    this.#data = Array(this.#attemptsLimit).fill(0).map(() =>
      this.#word.split("").fill(" ").map((letter) => ({
        letter,
        state: "blank",
      }))
    );
    (this.shadowRoot?.querySelector("yawdle-keyboard") as Keyboard)?.reset();
    this.requestUpdate();
  }

  #makeAttempt(attempt: string, submit = false) {
    // If the game is over, abort
    if (this.#ended) return;

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
      if (this.#attempts.length >= this.#attemptsLimit) this.#ended = true;
      if (attempt_ === this.#word) {
        this.#ended = true;
        this.#success = true;
      }
      this.dispatchEvent(
        new CustomEvent("yawdleAttemptMade", { detail: attempt_ }),
      );
      // TODO: Persist attempts to localstorage
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
        (this.shadowRoot?.querySelector("yawdle-keyboard") as Keyboard)?.setKey(
          letter,
          state,
        )
      );
    }
    this.requestUpdate();
  }

  #handleKey(key: string) {
    switch (key) {
      case "Enter":
        if (this.#attempt.length === this.#word.length) {
          this.#makeAttempt(this.#attempt, true);
          this.#attempt = "";
        }
        break;
      case "Backspace":
        this.#attempt = this.#attempt.slice(0, -1);
        this.#makeAttempt(this.#attempt);
        break;
      default:
        const letter = key.toLowerCase().match(/^[a-z]$/)?.[0] ?? "";
        if (letter) {
          this.#attempt += letter;
          this.#makeAttempt(this.#attempt);
        }
        break;
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
        this.#seed = newValue as string;
        this.#generateGame();
        break;
    }
  }

  render() {
    console.log({
      word: this.#word,
      attempt: this.#attempt,
      attempts: this.#attempts,
      data: this.#data,
    });
    //TODO: Game end and sharing
    return html` 
      <div class="words ${this.#ended ? "ended" : ""}">
        ${
      this.#data.map((data, i) =>
        html`<yawdle-word .data=${data} class="${
          i <= (this.#ended
              ? this.#attempts.length - 1
              : this.#attempts.length)
            ? "attempted"
            : ""
        }"></yawdle-word>`
      )
    }
      </div> 
      ${
      this.#ended
        ? html`<div class="end" style="display: none">
        ${this.#success ? "Congratulations!" : "Boo!!"}
      </div>`
        : ""
    }
      <yawdle-keyboard @yawdleKey=${(event: CustomEvent) =>
      this.#handleKey(event.detail)}></yawdle-keyboard>`;
  }
}
