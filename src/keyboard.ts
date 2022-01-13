import { customElement, property } from 'lit/decorators.js'
import { css, html, LitElement } from 'lit'
import './letter.js'
import { Letter } from './letter.js'

@customElement('yawdle-keyboard')
export class Keyboard extends LitElement {
  static get styles() {
    return css`
      :host {
        box-sizing: border-box;
        display: grid;
        place-items: center;
        gap: 1.5em;
        justify-items: stretch;

        --font-size: 1.5rem;
        font-size: var(--font-size);
      }

      div.keys {
        display: grid;
        place-items: center;
        gap: 0.5em;
      }

      div.row {
        display: flex;
        gap: 0.25em;
      }

      div.row:nth-child(3) {
        padding-right: 1.75em;
      }

      div.control {
        height: 1.5em;
        display: grid;
        grid-gap: 2em;
        grid-auto-flow: row;
        grid-template-columns: 1fr auto;
        user-select: none;
      }
      div.control > *:hover {
        opacity: 75%;
      }
      div.control > *:active {
        margin-top: 0.1em;
        margin-bottom: -0.1em;
      }

      div.key {
        height: 1.5em;
        display: grid;
        place-items: center;
        border-radius: 1.5em;
        background: var(--palette--paper--key);
        color: var(--palette--ink--on-dark);
        cursor: pointer;
      }
      #backspace {
        width: 3em;
      }
    `
  }

  @property({ reflect: true })
  enterLabel = 'enter'

  @property({ reflect: true, type: Boolean })
  canEnter = true

  @property({ reflect: true, type: Boolean })
  interactive = true

  #handleLetterClick(event: MouseEvent) {
    this.dispatchEvent(
      new CustomEvent('yawdleKey', { detail: (event.target as Letter).data }),
    )
  }

  #handleKeyup(key: string) {
    switch (key) {
      case 'Enter':
        ;(this.shadowRoot?.querySelector('#enter') as HTMLElement).click()
        break
      case 'Backspace':
        ;(this.shadowRoot?.querySelector('#backspace') as HTMLElement).click()
        break
      default:
        const letter = key.toLowerCase().match(/^[a-z]$/)?.[0] ?? ''
        if (letter) {
          ;(
            this.shadowRoot?.querySelector(
              `yawdle-letter[data=${letter}]`,
            ) as HTMLElement
          ).click()
        }
        break
    }
  }

  setKey(letter: string, state = 'key') {
    if (!this.shadowRoot) return
    const key = this.shadowRoot.querySelector(
      `yawdle-letter[data="${letter}"]`,
    ) as Letter
    key.state = state
  }
  reset() {
    if (!this.shadowRoot) return
    const keys = [
      ...this.shadowRoot.querySelectorAll(`yawdle-letter`),
    ] as Letter[]
    keys.forEach((key) => (key.state = 'key'))
  }

  constructor() {
    super()
    addEventListener('keyup', ({ key }) => this.#handleKeyup(key))
  }

  render() {
    const layout = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
    return html`
      <div class="keys ">
        ${layout.map(
          (row) =>
            html`<div class="row">
              ${row
                .split('')
                .map(
                  (letter) =>
                    html`<yawdle-letter
                      data=${letter}
                      state="key"
                      .interactive=${this.interactive}
                      @click="${this.#handleLetterClick}"
                    ></yawdle-letter>`,
                )}
            </div>`,
        )}
      </div>
      <div class="control">
        ${this.interactive
          ? html`
              <div
                class="key ${this.canEnter ? '' : 'disabled'}"
                id="enter"
                @click="${(_: Event) =>
                  this.dispatchEvent(
                    new CustomEvent('yawdleKey', { detail: 'Enter' }),
                  )}"
              >
                ${this.enterLabel}
              </div>
              <div
                class="key"
                id="backspace"
                @click="${(_: Event) =>
                  this.dispatchEvent(
                    new CustomEvent('yawdleKey', { detail: 'Backspace' }),
                  )}"
              >
                ×
              </div>
            `
          : ''}
      </div>
    `
  }
}
