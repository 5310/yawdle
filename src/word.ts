import { customElement, property } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import { Letter } from "./letter.js";

@customElement("v-word")
export class Word extends LitElement {
  static get styles() {
    return css`
      :host {
        box-sizing: border-box;
        display: grid;
        place-items: center;
      }

      div {
        display: flex;
        grid-gap: 1rem;
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
        html`<v-letter data=${letter} state=${state}></v-letter>`
      )
    }</div> `;
  }
}
