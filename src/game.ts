import _words from '/src/words.txt?raw'
import seedrandom from 'seedrandom'
// @ts-ignore
import tinyEnc from 'tiny-enc'
import sleep from './sleep.js'
import { customElement } from 'lit/decorators.js'
import { css, html, LitElement } from 'lit'
import './word.js'
import { Word } from './word.js'
import './keyboard.js'
import { Keyboard } from './keyboard.js'

const WORDS: { [word: string]: number } = Object.fromEntries(
  _words
    .trim()
    .split('\n')
    .map((entry) => entry.split(' '))
    .map(([word, freq]) => [word, parseInt(freq, 10)]),
)
// const COMMON_WORDS_LIMIT = 2000;
const RANDOM_BIAS = Math.LN10
const SCORE_EMOJI: { [key: string]: string } = {
  wrong: '⚪',
  partial: '🟡',
  exact: '🟢',
  blank: '⚫',
}

@customElement('yawdle-game')
export class Game extends LitElement {
  static get styles() {
    return css`
      :host {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        display: grid;
        gap: 1.5em;
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
        width: 18.7rem;
        cursor: pointer;
      }
      #status .buttons {
        display: flex;
        gap: 0.25em;
      }
      #status .buttons > *:first-child {
        padding-left: 1em;
        border-top-left-radius: 2em;
        border-bottom-left-radius: 2em;
      }
      #status .buttons > *:last-child {
        padding-right: 1em;
        border-top-right-radius: 2em;
        border-bottom-right-radius: 2em;
      }
      #status .button {
        height: 2em;
        display: flex;
        gap: 0.5em;
        align-items: center;
        padding: 0 0.75em;
        /* border-radius: 2em; */
        background: var(--palette--paper--blank);
      }
      #status .button:hover {
        opacity: 75%;
      }
      #status .button:active {
        opacity: 100%;
        transform: translateY(0.2em);
      }
      #status .seed > svg {
        margin-left: -0.033em;
        fill: var(--palette--ink--on-light);
      }
      #status .seed.success {
        background: var(--palette--paper--exact);
        color: var(--palette--ink--on-dark);
      }
      #status .seed.success > svg {
        fill: var(--palette--ink--on-dark);
      }
      #status .seed.failure {
        background: var(--palette--paper--wrong);
      }
      #status .new > svg {
        margin-left: -0.033em;
        fill: var(--palette--ink--on-light);
      }
      #status .attempts {
        padding-right: 0.5em;
      }
      #status > *:first-child {
        justify-self: start;
      }
      #status > *:last-child {
        justify-self: end;
      }

      #words > yawdle-word:not(.attempted) {
        opacity: 33%;
      }

      #message > * {
        padding: 0.5em 1em;
        border-radius: 2em;
      }
      #message > .success {
        color: var(--palette--paper--exact);
      }
      #message > :is(.redundant, .invalid) {
        opacity: 0.75;
      }
      #message > .blank {
        opacity: 0;
      }

      yawdle-keyboard {
        opacity: 75%;
      }
    `
  }

  #mode: 'solve' | 'reveal' | 'revealed' = 'solve'
  #seed = 'plagiarism'
  #word = ''
  #attemptsLimit = 6
  #attempts: string[] = []
  #attempt = ''
  #state: { letter: string; state: string }[][] = []
  #result = ''
  #ended = false
  #success = false

  async #generateGame() {
    const params = new URLSearchParams(location.search)

    // Get or generate seed
    this.#seed =
      params.get('s') ??
      Array.from(self.crypto.getRandomValues(new Uint32Array(1))).join('')
    params.set('s', this.#seed)

    // Check if a challenge is present
    this.#mode = params.has('c') ? 'reveal' : 'solve'

    // Reset parameters
    self.history.replaceState({}, '', `${location.pathname}?${params}`)

    //TODO: Display encrypted attempts from shared link

    // Select a random word
    const prng = seedrandom(this.#seed)
    const index = Math.floor(prng() ** RANDOM_BIAS * Object.keys(WORDS).length)
    this.#word = Object.keys(WORDS)[index]
    console.log('Game generated with the word', this.#word)

    // Reset the game
    this.#attempts = []
    this.#attempt = ''
    this.#ended = false
    this.#success = false
    this.#state = Array(this.#attemptsLimit)
      .fill(0)
      .map(() =>
        this.#word
          .split('')
          .fill(' ')
          .map((letter) => ({
            letter,
            state: 'blank',
          })),
      )
    ;(this.shadowRoot?.querySelector('yawdle-keyboard') as Keyboard)?.reset()
    this.requestUpdate()

    // Load any previously saved attempts
    await sleep()
    const attempts: string[] = JSON.parse(
      localStorage.getItem(this.#seed) ?? '[]',
    )
    attempts.forEach((attempt) => this.makeAttempt(attempt))
  }

  makeAttempt(attempt: string, submit = true) {
    // If the game is over, abort
    if (this.#ended) return

    // Clean the attmpted word
    const attempt_ = Word.validateWord(attempt).slice(0, this.#word.length)
    this.#attempt = attempt_

    // If it's a redundant submission, abort
    const redundant = this.#attempts.includes(this.#attempt)
    // Check if attempts is a valid dictionary word
    const valid = WORDS[this.#attempt]
    // Set the index of the attempt
    const index = this.#attempts.length

    // If a valid submission, accept it
    if (submit) {
      if (redundant) {
        this.#attempt = ''
        this.#result = 'redundant'
      } else if (valid) {
        // Accept the attempt
        this.#attempts.push(this.#attempt)
        if (this.#attempts.length >= this.#attemptsLimit) this.#ended = true
        if (this.#attempt === this.#word) {
          this.#ended = true
          this.#success = true
        }
        this.#result = 'valid'
        // Persist to localStorage
        try {
          localStorage.setItem(this.#seed, JSON.stringify(this.#attempts))
        } catch (e) {}
        // Emit attempt as event
        this.dispatchEvent(
          new CustomEvent('yawdleAttemptMade', { detail: this.#state[index] }),
        )
      } else {
        this.#result = 'invalid'
      }
    }

    // Reflect the attempt to the UI
    this.#state[index] = this.#attempt
      .padEnd(this.#word.length, ' ')
      .split('')
      .map((letter, i) => ({
        letter: !submit ? letter : valid ? letter : ' ',
        state: !submit
          ? letter === ' '
            ? 'blank'
            : 'key'
          : redundant
          ? 'blank'
          : !valid
          ? 'blank'
          : this.#word[i] === letter
          ? 'exact'
          : this.#word.includes(letter)
          ? 'partial'
          : 'wrong',
      }))
    if (submit && !redundant && valid) {
      this.#state[index].forEach(({ letter, state }) =>
        (this.shadowRoot?.querySelector('yawdle-keyboard') as Keyboard)?.setKey(
          letter,
          state,
        ),
      )
    }
    // Update UI
    this.requestUpdate()
    const $message = this.shadowRoot?.querySelector('#message') as HTMLElement
    if ($message && submit) {
      if (['redundant', 'invalid'].includes(this.#result)) {
        $message.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-0.2em)' },
            { transform: 'translateX(0)' },
            { transform: 'translateX(0.2em)' },
            { transform: 'translateX(0)' },
            { transform: 'translateX(-0.2em)' },
            { transform: 'translateX(0)' },
          ],
          {
            duration: 500,
          },
        )
        $message.animate([{ opacity: '100%' }, { opacity: '0%' }], {
          duration: 3000,
          fill: 'forwards',
        })
      }
    }

    // Reset attempt if submitted
    if (submit) this.#attempt = ''

    // return result for solvers
    return submit && valid ? this.#state[index] : null
  }

  #handleKey(key: string) {
    switch (key) {
      case 'Enter':
        if (this.#attempt.length >= this.#word.length) {
          this.makeAttempt(this.#attempt, true)
          this.#attempt = ''
        }
        break
      case 'Backspace':
        this.#attempt = this.#attempt.slice(0, -1)
        this.makeAttempt(this.#attempt, false)
        break
      default:
        const letter = key.toLowerCase().match(/^[a-z]$/)?.[0] ?? ''
        if (letter) {
          this.#attempt += letter
          this.makeAttempt(this.#attempt, false)
        }
        break
    }
  }

  async #share() {
    // Compose the shared content

    const title = `Yawdle #${this.#seed}`

    const score = `${
      this.#ended && !this.#success ? 'X' : this.#attempts.length
    }/${this.#attemptsLimit}`

    const scorecard = this.#state
      .map((attempt) =>
        attempt
          .map(({ state }) => SCORE_EMOJI[state as string] ?? '⚪')
          .join(''),
      )
      .join('\n')

    const params = new URLSearchParams(location.search)
    params.set(
      'c',
      await tinyEnc.encrypt(this.#seed, JSON.stringify(this.#attempts)),
    )
    const url = `${location.origin}${location.pathname}?${params}`

    // Animate button
    const $ = this.shadowRoot?.querySelector('#status .seed') as HTMLElement
    if ($) {
      $.animate(
        [
          { transform: 'translateY(0)' },
          { transform: 'translateY(-0.2em)' },
          { transform: 'translateY(0.1em)' },
          { transform: 'translateY(-0.05em)' },
          { transform: 'translateY(0)' },
        ],
        {
          duration: 500,
        },
      )
    }

    // Try to share the content
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `${title}, ${score}

${scorecard}

`,
          url,
        })
        return
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          `${title}, ${score}
${scorecard}
    
${url}}`,
        )
        return
      }
    } catch (e) {
      console.error(e)
    }
  }

  constructor() {
    super()
  }

  connectedCallback() {
    super.connectedCallback()
    this.#generateGame()
  }

  attributeChangedCallback(
    name: string,
    _oldValue: unknown,
    newValue: unknown,
  ) {
    switch (name) {
      case 'seed':
        this.#seed = newValue as string
        this.#generateGame()
        break
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
    })

    return html`
      <div id="status" class=${this.#mode}>
        <div class="buttons">
          <div
            class="button seed ${this.#ended
              ? this.#success
                ? 'success'
                : 'failure'
              : ''}"
            @click=${this.#mode === 'solve' ? this.#share : undefined}
          >
            <svg
              width="1em"
              height="1em"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 10c-.707 0-1.356.244-1.868.653L6.929 8.651a3.017 3.017 0 0 0 0-1.302l3.203-2.002a3 3 0 1 0-1.06-1.696L5.867 5.653a3 3 0 1 0 0 4.694l3.203 2.002A3 3 0 1 0 12 10Z"
              />
            </svg>
            ${this.#seed}
          </div>
          <div
            class="button new"
            @click=${() => (location.href = location.pathname)}
          >
            <svg
              width="1em"
              height="1em"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.78 11.22a.75.75 0 0 1 0 1.06l-2.5 2.5c-.469.469-1.28.14-1.28-.53V13h-1.837a.375.375 0 0 1-.274-.12l-2.205-2.362L9.35 8.733 11 10.5h1V9.25c0-.67.81-1 1.28-.53l2.5 2.5ZM.375 5.5H3l1.65 1.767 1.666-1.786L4.111 3.12A.375.375 0 0 0 3.837 3H.375A.375.375 0 0 0 0 3.375v1.75c0 .207.168.375.375.375ZM12 5.5v1.25c0 .67.811.999 1.28.53l2.5-2.5a.75.75 0 0 0 0-1.06l-2.5-2.5C12.81.75 12 1.08 12 1.75V3h-1.837a.375.375 0 0 0-.274.12L3 10.5H.375a.375.375 0 0 0-.375.375v1.75c0 .207.168.375.375.375h3.462a.375.375 0 0 0 .274-.12L11 5.5h1Z"
              />
            </svg>
          </div>
        </div>
        <div class="attempts">
          ${this.#ended && !this.#success ? 'X' : this.#attempts.length}/${this
            .#attemptsLimit}
        </div>
      </div>

      <div id="words" class="${this.#ended ? 'ended' : ''} ${this.#mode}">
        ${this.#state.map(
          (data, i) =>
            html`<yawdle-word
              .data=${data}
              class="${i <=
              (this.#ended ? this.#attempts.length - 1 : this.#attempts.length)
                ? 'attempted'
                : ''}"
            ></yawdle-word>`,
        )}
      </div>

      <div id="message" class=${this.#mode}>
        ${this.#ended
          ? this.#success
            ? html`<p class="success">
                You got it, it's
                <a
                  target="_blank"
                  href="https://en.wiktionary.org/wiki/${this.#word}#English"
                  >${this.#word}</a
                >!
              </p>`
            : html`<p class="failure">Better luck next time!</p>`
          : this.#result === 'redundant'
          ? html`<p class="redundant">Try a new word</p>`
          : this.#result === 'invalid'
          ? html`<p class="invalid">Not on the list</p>`
          : html`<p class="blank">...</p>`}
      </div>

      <yawdle-keyboard
        .interactive=${!this.#ended}
        enterLabel="submit"
        @yawdleKey=${(event: CustomEvent) => this.#handleKey(event.detail)}
        class=${this.#mode}
      ></yawdle-keyboard>
    `
  }
}
