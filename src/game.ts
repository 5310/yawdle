import _words from "/src/words.txt?raw";
import seedrandom from "seedrandom";
import sleep from "./sleep.js";
import { customElement } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import "./word.js";
import { Word } from "./word.js";
import "./keyboard.js";
import { Keyboard } from "./keyboard.js";

const WORDS = _words.trim().split("\n");
const SCORE_EMOJI: { [key: string]: string } = {
  wrong: "⚪",
  partial: "🟡",
  exact: "🟢",
  blank: "⚫",
};

@customElement("yawdle-game")
export class Game extends LitElement {
  static get styles() {
    return css`
      :host {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        display: grid;
        gap: 2em;
        place-items: center;
        align-content: center;
        padding: 1rem;
        color: var(--palette--ink--on-light);
      }

      :host > div {
        display: grid;
        gap: 1rem;
        place-items: center;
      }

      a {
        color: inherit;
        text-decoration: underline solid 0.25em;
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
        gap: 0.25em;
        align-items: center;
      }
      #status > .seed > svg {
        margin-left: -0.033em;
        fill: var(--palette--ink--on-light);
      }
      #status > *:last-child {
        justify-self: end;
      }

      #words > yawdle-word:not(.attempted) {
        opacity: 33%;
      }

      #message.ephemeral {
        transition-property: opacity;
        transition-duration: 2s;
        transition-delay: 1s;
        opacity: 0;
      }
      #message > * {
        padding: 0.5em 1em;
        border-radius: 2em;
      }
      #message > .success {
        background: var(--palette--paper--exact);
        color: var(--palette--ink--on-dark);
      }
      #message > .failure {
        background: var(--palette--paper--wrong);
        color: var(--palette--ink--on-light);
      }
      #message > :is(.redundant, .invalid) {
        background: var(--palette--paper--partial);
        color: var(--palette--ink--on-light);
      }
      #message > .blank {
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
  #state: { letter: string; state: string }[][] = [];
  #result = "";
  #ended = false;
  #success = false;

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
    this.#state = Array(this.#attemptsLimit).fill(0).map(() =>
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

    // Reset result
    this.#result = "";

    // Clean the attmpted word
    const attempt_ = Word.validateWord(attempt)
      .slice(0, this.#word.length);
    this.#attempt = attempt_;

    // If it's a redundant submission, abort
    const redundant = this.#attempts.includes(this.#attempt);
    // Check if attempts is a valid dictionary word
    const valid = WORDS.includes(this.#attempt);
    // Set the index of the attempt
    const index = this.#attempts.length;

    // If a valid submission, accept it
    if (submit) {
      if (redundant) {
        this.#attempt = "";
        this.#result = "redundant";
      } else if (valid) {
        this.#attempts.push(this.#attempt);
        if (this.#attempts.length >= this.#attemptsLimit) this.#ended = true;
        if (this.#attempt === this.#word) {
          this.#ended = true;
          this.#success = true;
        }
        this.dispatchEvent(
          new CustomEvent("yawdleAttemptMade", { detail: this.#state[index] }),
        );
        // TODO: Persist attempts to localstorage
      } else {
        this.#result = "invalid";
        this.#fadeMessage();
      }
    }

    // Reflect the attempt to the UI
    this.#state[index] = this.#attempt
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
    if (submit && !redundant && valid) {
      this.#state[index].forEach(({ letter, state }) =>
        (this.shadowRoot?.querySelector("yawdle-keyboard") as Keyboard)?.setKey(
          letter,
          state,
        )
      );
    }
    // TODO: post message about attempt
    // Update UI
    this.requestUpdate();
    if (submit) this.#fadeMessage();

    // return result for solvers
    if (submit && valid) return this.#state[index];
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

  async #share(_challenge = false) {
    const title = `Yawdle #${this.#seed}`;
    const score = `${
      this.#ended && !this.#success ? "X" : this.#attempts.length
    }/${this.#attemptsLimit}`;
    const scorecard = this.#state.map(
      (attempt) =>
        attempt.map(({ state }) => SCORE_EMOJI[state as string] ?? "⚪")
          .join(""),
    ).join("\n");
    const url = location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `${title}, ${score}

${scorecard}

`,
          url,
        });
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          `${title}, ${score}
${scorecard}
    
${url}}`,
        );
        return;
      }
    } catch (e) {
      console.error(e);
    }
  }

  async #fadeMessage() {
    // Do pointless manual animation-state management because Lit can't be bothered to add the bare minimum functionality
    const $ = this.shadowRoot?.querySelector("#message") as HTMLElement;
    $.classList.remove("ephemeral");
    if (this.#result) {
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
      ended: this.#ended,
      success: this.#success,
      data: this.#state,
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

      <div id="status" @click=${() => this.#share()}>
        <div class="seed">
          <svg width="1em" height="1em" viewBox="0 0 16 16"fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 10c-.707 0-1.356.244-1.868.653L6.929 8.651a3.017 3.017 0 0 0 0-1.302l3.203-2.002a3 3 0 1 0-1.06-1.696L5.867 5.653a3 3 0 1 0 0 4.694l3.203 2.002A3 3 0 1 0 12 10Z"/>
            </svg>${this.#seed}</div>
        <div class="attempts">${
      this.#ended && !this.#success ? "X" : this.#attempts.length
    }/${this.#attemptsLimit}</div>
      </div>

      <div id="words ${this.#ended ? "ended" : ""}">
        ${
      this.#state.map((data, i) =>
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

      <div id="message">     
        ${
      this.#ended
        ? this.#success
          ? html
            `<p class="success">You got it, it's <a target="_blank" href="https://en.wiktionary.org/wiki/${this.#word}#English">${this.#word}</a>!</p>`
          : html`<p class="failure">Better luck next time!</p>`
        : this.#result === "redundant"
        ? html`<p class="redundant" >Try a new word</p>`
        : this.#result === "invalid"
        ? html`<p class="invalid">Not on the list</p>`
        : html`<p class="blank">...</p>`
    }
      </div>

      <yawdle-keyboard @yawdleKey=${(event: CustomEvent) =>
      this.#handleKey(event.detail)}></yawdle-keyboard>
      
      `;
  }
}
