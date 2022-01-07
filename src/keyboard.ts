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
        padding-right: 1.5em;
      }
    `;
  }

  setKey(letter: string, state: string) {}
  reset() {}

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
