import _words from "/src/powerlanguage.5.txt?raw";
import seedrandom from "seedrandom";
import sleep from "./sleep.js";
import { customElement, property } from "lit/decorators.js";
import { css, html, LitElement, TemplateResult } from "lit";
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
        grid-gap: 2em;
        place-items: center;
        align-content: center;
        padding: 1rem;
        color: var(--palette--ink--on-light);
      }

      :host > div {
        display: grid;
        grid-gap: 1rem;
        place-items: center;
      }

      #status {
        grid-auto-flow: column;
        width: 18.4rem;
        height: 1em;
        cursor: pointer;
        opacity: 75%;
      }
      #status:hover {
        opacity: 100%;
      }
      #status:active {
        opacity: 100%;
        margin-top: 0.2em;
        margin-bottom: -0.2em;
      }
      #status > * {
        height: 100%;
      }
      #status > *:first-child {
        justify-self: start;
      }
      #status > .seed {
        display: flex;
        grid-gap: 0.25em;
      }
      #status > .seed > svg {
        margin-left: -0.033em;
        margin-top: 0.066em;
        fill: var(--palette--ink--on-light);
      }
      #status > *:last-child {
        justify-self: end;
      }

      #words > yawdle-word:not(.attempted) {
        opacity: 33%;
      }

      #message {
        height: 3em;
      }
      #message.ephemeral {
        transition-property: opacity;
        transition-duration: 4s;
        transition-delay: 1s;
        opacity: 0;
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

  @property({ state: true })
  _message: TemplateResult = html``;
  @property({ state: true })
  _messageHide = false;

  #generateGame() {
    // Get or generate seed
    const params = new URLSearchParams(location.search);
    this.#seed = params.get("s") ??
      Array.from(self.crypto.getRandomValues(new Uint32Array(1))).join("");
    params.set("s", this.#seed);
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

    // TODO: Load attempts to localstorage if valid
  }

  #makeAttempt(attempt: string, submit = false) {
    // If the game is over, abort
    if (this.#ended) return;

    // Clean the attmpted word
    let attempt_ = Word.validateWord(attempt)
      .slice(0, this.#word.length);

    // If it's a redundant submission, abort
    if (submit && this.#attempts.includes(attempt_)) {
      this.#toastMessage(html`"${attempt_}" has already been attempted`, true);
      this.#attempt = "";
      this.#makeAttempt(this.#attempt, true);
      return;
    }

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
      // TODO: Extract these to the template instead
      if (this.#ended) {
        this.#toastMessage(html`<span style="cursor: pointer" @click=${() => {
          (this.shadowRoot?.querySelector("#status") as HTMLElement)?.click();
        }}>${
          this.#success ? "Congratulations!" : "Better luck next time!"
        }</span>`);
      }
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
    // TODO: post message about attempt
    this.requestUpdate();
  }

  #handleKey(key: string) {
    switch (key) {
      case "Enter":
        if (this.#attempt.length >= this.#word.length) {
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

  async #toastMessage(message = html``, ephemeral = false) {
    const $ = this.shadowRoot?.querySelector("#message") as HTMLElement;
    this._message = message;
    $.classList.remove("ephemeral");
    if (ephemeral) {
      await sleep();
      $.classList.add("ephemeral");
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
    // TODO: Sharing
    //  Modal
    //    Share text with score and link
    //    Option to include results and message as a challenge
    // TODO: Message missed attempts
    //   Must be ephemeral
    // TODO: Message the game ending
    //   Activate the share button by proxy
    //   Also link to Wiktionary with the result if successful
    //   Never give away the result

    return html` 

      <div id="status" @click=${() => console.log("status clicked")}>
        <div class="seed">
          <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- <style>
              path { fill: var(--palette--ink--on-light); }
            </style> -->
            <path d="M12 10c-.707 0-1.356.244-1.868.653L6.929 8.651a3.017 3.017 0 0 0 0-1.302l3.203-2.002a3 3 0 1 0-1.06-1.696L5.867 5.653a3 3 0 1 0 0 4.694l3.203 2.002A3 3 0 1 0 12 10Z"/>
            </svg>${this.#seed}</div>
        <div class="attempts">${
      this.#ended && !this.#success ? "X" : this.#attempts.length
    }/${this.#attemptsLimit}</div>
      </div>

      <div id="words ${this.#ended ? "ended" : ""}">
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

      <div id="message" class="ephemeral">
        ${this._message}
      </div>

      <yawdle-keyboard @yawdleKey=${(event: CustomEvent) =>
      this.#handleKey(event.detail)}></yawdle-keyboard>
      
      `;
  }
}
