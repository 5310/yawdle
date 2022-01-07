import { customElement, property } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import "./letter.js";
import { Letter } from "./letter.js";

@customElement("v-keyboard")
export class Keyboard extends LitElement {
  static get styles() {
    return css`
      :host {
        box-sizing: border-box;
        display: grid;
        place-items: center;

        --font-size: 1.5rem;
        font-size: var(--font-size);
      }

      div {
        display: flex;
        grid-gap: 0.25em;
      }

      div.row:nth-child(3) {
        padding-right: 1.75em;
      }
    `;
  }

  setKey(letter: string, state = "key") {
    if (!this.shadowRoot) return;
    const key = this.shadowRoot.querySelector(
      `v-letter[data="${letter}"]`,
    ) as Letter;
    key.state = state;
  }
  reset() {
    if (!this.shadowRoot) return;
    const keys = [...this.shadowRoot.querySelectorAll(`v-letter`)] as Letter[];
    keys.forEach((key) => key.state = "key");
  }

  constructor() {
    super();
  }

  render() {
    const layout = [
      "qwertyuiop",
      "asdfghjkl",
      "zxcvbnm",
    ];
    return html` 
      ${
      layout.map((row) =>
        html`<div class='row'>${
          row.split("").map((letter) =>
            html`<v-letter data=${letter} state='key'></v-letter>`
          )
        }</div>`
      )
    }
    `;
  }
}
