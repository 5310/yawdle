import { customElement, property } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import "./letter.js";
import { Letter } from "./letter.js";

@customElement("yawdle-word")
export class Word extends LitElement {
  static get styles() {
    return css`
      :host {
        box-sizing: border-box;
        display: grid;
        place-items: center;
        font-size: 2rem;
      }

      div {
        display: flex;
        grid-gap: 0.5em;
      }
    `;
  }

  @property({ attribute: false })
  data: { letter: string; state: string }[] = [];

  static validateWord(word: string) {
    return word
      .split("")
      .map((letter) => Letter.validateLetter(letter))
      .filter((letter) => letter)
      .join("");
  }

  constructor() {
    super();
  }

  render() {
    return html` <div>${
      this.data.map(({ letter, state }) =>
        html`<yawdle-letter data=${letter} state=${state}></yawdle-letter>`
      )
    }</div> `;
  }
}
