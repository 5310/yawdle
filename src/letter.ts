import { customElement, property } from "lit/decorators.js";
import { css, html, LitElement } from "lit";

@customElement("yawdle-letter")
export class Letter extends LitElement {
  static get styles() {
    return css`
      :host {
        box-sizing: border-box;
        font-size: var(--font-size, 2rem);
      }

      div {
        display: grid;
        place-items: center;
        cursor: default;

        width: 1.5em;
        height: 1.5em;
        border-radius: 50%;

        background: var(--palette--paper--key);
        color: var(--palette--ink--on-dark);

        line-height: 0;
      }

      div.disabled {
        background: var(--palette--paper--disabled);
        color: var(--palette--ink--on-dark);
      }
      div.blank {
        background: var(--palette--paper--blank);
        color: transparent;
      }
      div.wrong {
        background: var(--palette--paper--wrong);
        color: var(--palette--ink--on-light);
      }
      div.wrong > span {
        opacity: 33%;
      }
      div.partial {
        background: var(--palette--paper--partial);
        color: var(--palette--ink--on-light);
      }
      div.wrong > span {
        opacity: 66%;
      }
      div.exact {
        background: var(--palette--paper--exact);
        color: var(--palette--ink--on-dark);
      }
      div.key {
        background: var(--palette--paper--key);
        color: var(--palette--ink--on-dark);
        cursor: pointer; 
      }

      /* TODO: Interactive states styling */
    `;
  }

  @property({ reflect: true })
  data = " ";

  @property({ reflect: true })
  state = "blank";

  @property({ type: "boolean" })
  interactive = false;

  static validateLetter(letter: string) {
    return letter.replace(/[^a-z ]/g, "")[0];
  }

  static validateState(state: string): string | undefined {
    return ["disabled", "blank", "wrong", "partial", "exact", "key"].includes(
        state,
      )
      ? state
      : undefined;
  }

  constructor() {
    super();
  }

  attributeChangedCallback(name: string, oldValue: unknown, newValue: unknown) {
    switch (name) {
      case "data":
        {
          const newValue_ = Letter.validateLetter(newValue as string);
          if (newValue_ && newValue_ !== oldValue) {
            this.data = newValue_;
            this.requestUpdate();
          }
        }
        break;

      case "state":
        {
          const newValue_ = Letter.validateState(newValue as string);
          if (newValue_ && newValue_ !== oldValue) {
            this.state = newValue_;
            this.requestUpdate();
          }
        }
        break;
    }
    this.requestUpdate();
  }

  render() {
    return html` 
      <div class="${this.state} ${this.interactive ? "interactive" : ""}">
        <span>${this.data}</span>
      </div>
    `;
  }
}
