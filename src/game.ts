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
const WORDS_BUCKET: { [freq: string]: string[] } = Object.entries(WORDS).reduce(
  (acc, [word, freq]) => {
    const freq_ = freq.toString().padStart(20, '0')
    acc[freq_] = acc[freq_] || []
    acc[freq_].push(word)
    return acc
  },
  {} as { [freq: string]: string[] },
)
const RANDOM_BIAS = 3
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
        grid-template: 'container';
        gap: 1rem;
        place-items: center;
      }

      a {
        color: inherit;
        text-decoration: underline solid 0.25em;
      }

      #readme {
        display: flex;
        position: absolute;
        top: 0;
        right: 0;
        padding: 0.5em;
        cursor: pointer;
      }
      #readme:hover {
        opacity: 75%;
      }
      #readme a {
        box-sizing: border-box;
        width: 2em;
        height: 2em;
        display: grid;
        place-items: center;
        border-radius: 1em;
        opacity: 33%;
      }
      #readme svg {
        fill: var(--palette--ink--on-light);
      }

      #status {
        grid-auto-flow: column;
        width: 18.7rem;
      }
      #status .buttons {
        display: flex;
        gap: 0.25em;
        cursor: pointer;
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
        user-select: none;
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
      #status.solve .seed.success {
        background: var(--palette--paper--exact);
        color: var(--palette--ink--on-dark);
      }
      #status.solve .seed.success > svg {
        fill: var(--palette--ink--on-dark);
      }
      #status.solve .seed.failure {
        background: var(--palette--paper--wrong);
      }
      #status:not(.solve) .seed {
        background: var(--palette--paper--key);
        color: var(--palette--ink--on-dark);
      }
      #status:not(.solve) .seed > svg {
        fill: var(--palette--ink--on-dark);
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

      #words {
        place-items: stretch;
      }
      #words > * {
        grid-area: container;
        display: grid;
        grid-template: 'container';
        gap: 1rem;
        place-items: center;
      }
      #words .words > yawdle-word {
        opacity: 33%;
      }
      #words:not(.unrevealed) .words > yawdle-word.attempted {
        opacity: 100%;
      }
      #words .information {
        z-index: 100;
        box-sizing: border-box;
        width: 19em;
        padding: 0.5em;
        border-radius: 1.5em;
        align-content: center;
        line-height: 1em;
        background: var(--palette--paper--blank);
        backdrop-filter: blur(8px);
        place-items: start;
        padding: 0 1.5em;
      }
      #words .information p {
        margin: 0;
      }
      #words .information p.small {
        font-size: 0.75rem;
        opacity: 0.75;
      }
      #words yawdle-letter {
        font-size: 0.75rem;
      }
      #words:not(.unrevealed) .revelation {
        display: none;
      }
      #words.unrevealed .instruction {
        display: none;
      }
      #words .instruction > div {
        display: grid;
        place-items: center;
        grid-template-columns: auto 1fr;
        gap: 1em;
      }

      #words #message {
        height: 5em;
        text-align: center;
      }
      #message > * {
        padding: 0.5em 1em;
        border-radius: 2em;
      }
      #message.solve > .success {
        color: var(--palette--paper--exact);
      }
      #message > :is(.redundant, .invalid) {
        opacity: 0.75;
      }
      #message > .blank {
        opacity: 0;
      }
      #message.unrevealed > * {
        margin: 0;
        padding: 0;
      }

      yawdle-keyboard {
        opacity: 75%;
      }
    `
  }

  #mode: 'solve' | 'unrevealed' | 'revealed' = 'solve'
  #solution = ''
  #seed = 'plagiarism'
  #word = ''
  #attemptsLimit = 6
  #attempts: string[] = []
  #attempt = ''
  #state: { letter: string; state: string }[][] = []
  #result: 'redundant' | 'invalid' | 'valid' | '' = ''
  #ended = false
  #success = false

  async #generateGame() {
    const params = new URLSearchParams(location.search)

    // Reset parameters if no seed present
    if (!params.has('s'))
      self.history.replaceState({}, '', `${location.pathname}`)

    // Check if a challenge is present
    this.#mode = params.has('c') ? 'unrevealed' : 'solve'

    // Get or generate seed
    this.#seed =
      params.get('s') ??
      Array.from(self.crypto.getRandomValues(new Uint32Array(1))).join('')
    params.set('s', this.#seed)
    self.history.replaceState({}, '', `${location.pathname}?${params}`)

    // Select a random word
    const prng = seedrandom(this.#seed)
    const i = prng()
    const j = prng()
    const bucket =
      WORDS_BUCKET[
        Object.keys(WORDS_BUCKET)[
          Math.floor(i ** RANDOM_BIAS * Object.keys(WORDS_BUCKET).length)
        ]
      ]
    this.#word = bucket[Math.floor(j * bucket.length)]

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

    // If score colors shared, color them
    if (this.#mode === 'unrevealed') {
      const scoreStates = (params.get('k') ?? '')
        .split('-')
        .map((s) => s.split(''))
      scoreStates.forEach((states, i) => {
        states.forEach((state, j) => {
          this.#state[i][j].state =
            { w: 'wrong', p: 'partial', e: 'exact' }[state] ?? 'blank'
        })
      })
    }

    // Load any previously saved attempts
    if (this.#mode === 'solve') {
      await sleep()
      const attempts: string[] = JSON.parse(
        localStorage.getItem(this.#seed) ?? '[]',
      )
      attempts.forEach((attempt) => this.makeAttempt(attempt))
    }
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
        if (this.#mode === 'solve') {
          try {
            localStorage.setItem(this.#seed, JSON.stringify(this.#attempts))
          } catch (e) {}
        }
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
      } else {
        $message.getAnimations().forEach((animation) => animation.cancel())
      }
    }

    // Reset attempt if submitted
    if (submit) this.#attempt = ''

    // return result for solvers
    return submit && valid ? this.#state[index] : null
  }

  async makeReveal(solution: string, submit = true) {
    // If the game is over, abort
    if (this.#ended) return

    // Clean the attmpted word
    const solution_ = Word.validateWord(solution).slice(0, this.#word.length)
    this.#solution = solution_

    // Check if attempts is a valid dictionary word
    const valid = WORDS[this.#solution]

    if (submit) {
      if (valid) {
        try {
          const params = new URLSearchParams(location.search)
          const challenge = params.get('c')
          const attempts: string[] = JSON.parse(
            await tinyEnc.decrypt(this.#solution, challenge),
          )
          this.#mode = 'revealed'
          attempts.forEach((attempt) => this.makeAttempt(attempt))
        } catch {}
      } else {
      }
    }
    this.requestUpdate()
    const $words = this.shadowRoot?.querySelector(
      '#message.unrevealed > yawdle-word',
    ) as HTMLElement
    if ($words && submit) {
      $words.animate(
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
    }
  }

  #handleKey(key: string) {
    // Hide info modal
    this.#manageInfo(false)
    switch (this.#mode) {
      case 'solve':
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
        break
      case 'unrevealed':
        switch (key) {
          case 'Enter':
            if (this.#solution.length >= this.#word.length) {
              this.makeReveal(this.#solution, true)
              this.#solution = ''
            }
            break
          case 'Backspace':
            this.#solution = this.#solution.slice(0, -1)
            this.makeReveal(this.#solution, false)
            break
          default:
            const letter = key.toLowerCase().match(/^[a-z]$/)?.[0] ?? ''
            if (letter) {
              this.#solution += letter
              this.makeReveal(this.#solution, false)
            }
            break
        }
        break
    }
  }

  #manageInfo(set?: boolean) {
    const $ = this.shadowRoot?.querySelector(
      '#words .instruction',
    ) as HTMLElement
    $.style.display =
      set !== undefined
        ? set
          ? 'grid'
          : 'none'
        : $.style.display === 'none'
        ? 'grid'
        : 'none'
  }

  async #share() {
    // Compose the shared content

    const title = `Yawdle #${this.#seed}`

    const score = `${
      this.#ended && !this.#success ? 'X' : this.#attempts.length
    }/${this.#attemptsLimit}`

    const scorecard = this.#state
      .slice(0, this.#attempts.length)
      .map((attempt) =>
        attempt
          .map(({ state }) => SCORE_EMOJI[state as string] ?? '⚪')
          .join(''),
      )
      .join('\n')

    const params = new URLSearchParams(location.search)
    params.set(
      'c',
      await tinyEnc.encrypt(this.#word, JSON.stringify(this.#attempts)),
    )
    params.set(
      'k',
      this.#state
        .filter(
          (attempt) =>
            !attempt.some(
              ({ state }) => !['wrong', 'partial', 'exact'].includes(state),
            ),
        )
        .map((attempt) => attempt.map(({ state }) => state[0]).join(''))
        .join('-'),
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
    
${url}`,
        )
        return
      }
    } catch (e) {
      console.error(e)
    }
  }

  #clean(trigger = false) {
    const params = new URLSearchParams('')
    params.set('s', this.#seed)
    const href = `${location.pathname}?${params}`
    if (trigger) location.href = href
    return href
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
    return html`
      <div 
        id="readme"
        @click=${(_: Event) => {
          this.#manageInfo()
        }}
          >
          <svg
            width="1em"
            height="1em"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 .25a7.751 7.751 0 0 0 0 15.5A7.75 7.75 0 1 0 8 .25Zm0 3.438a1.313 1.313 0 1 1 0 2.625 1.313 1.313 0 0 1 0-2.625Zm1.75 7.937a.375.375 0 0 1-.375.375h-2.75a.375.375 0 0 1-.375-.375v-.75c0-.207.168-.375.375-.375H7v-2h-.375a.375.375 0 0 1-.375-.375v-.75c0-.207.168-.375.375-.375h2c.207 0 .375.168.375.375V10.5h.375c.207 0 .375.168.375.375v.75Z"
            />
          </svg>
      </div>
      
      <div id="status" class=${this.#mode}>
        <div class="buttons">
          <div
            class="button seed ${
              this.#ended ? (this.#success ? 'success' : 'failure') : ''
            }"
            @click=${() => {
              if (this.#mode === 'solve') this.#share()
              else this.#clean(true)
            }}
          >
            ${
              this.#mode === 'solve'
                ? html`<svg
                    width="1em"
                    height="1em"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 10c-.707 0-1.356.244-1.868.653L6.929 8.651a3.017 3.017 0 0 0 0-1.302l3.203-2.002a3 3 0 1 0-1.06-1.696L5.867 5.653a3 3 0 1 0 0 4.694l3.203 2.002A3 3 0 1 0 12 10Z"
                    />
                  </svg>`
                : html`<svg
                    width="1em"
                    height="1em"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7 9.5v3.25c0 .67-.811.999-1.28.53l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5C6.19 2.75 7 3.08 7 3.75V9.5ZM15 9.5H7V7h8v2.5Z"
                    />
                  </svg>`
            }
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
          ${this.#ended && !this.#success ? 'X' : this.#attempts.length}/${
      this.#attemptsLimit
    }
        </div>
      </div>

      <div id="words" class="${this.#ended ? 'ended' : ''} ${this.#mode}">
        <div class="words">
          ${this.#state.map(
            (data, i) =>
              html`<yawdle-word
                .data=${data}
                class="${i <=
                (this.#ended
                  ? this.#attempts.length - 1
                  : this.#attempts.length)
                  ? 'attempted'
                  : ''}"
              ></yawdle-word>`,
          )}
        </div>
        <div class="information revelation">
          <p>A player shared this attempt at solving this puzzle</p>
          <p><a href="${this.#clean()}">Solve it</a> for yourself</p>
          <p>Enter the solution below to reveal their attempt</p>
        </div>
        <div class="information instruction">
          <p>
            Yawdle is Yet Another <a href=""></a>Wordle</a> DupLicatE!
          </p>
          <p>
            Now with on-demand shareable puzzles, fully offline, no timezones!
          </p>
          <p class="small">
            To play, guess a 5-letter word in six attempts—
          </p>
          <div>
            <yawdle-letter state="exact"></yawdle-letter>
            <p class="small">
              The letter is in the word and at the correct spot
            </p>
          </div>
          <div>
            <yawdle-letter state="partial"></yawdle-letter>
            <p class="small">
              The letter is in the word but not at the correct spot
            </p>
          </div>
          <div>
            <yawdle-letter state="wrong"></yawdle-letter>
            <p class="small">The letter is not in the word</p>
          </div>
          <p class="small">Type any letter to begin!</p>
        </div>
      </div>

      <div id="message" class=${this.#mode}>
        ${
          this.#mode === 'unrevealed'
            ? html`
                <yawdle-word
                  class="solution"
                  .data=${this.#solution
                    .slice(0, this.#word.length)
                    .padEnd(this.#word.length, ' ')
                    .split('')
                    .map((letter) => ({
                      letter: ' ',
                      state: letter === ' ' ? 'blank' : 'key',
                    }))}
                >
                </yawdle-word>
              `
            : ''
        }
        ${
          this.#mode === 'revealed'
            ? this.#ended
              ? this.#success
                ? html`<p class="success">
                    This player solved
                    <a
                      target="_blank"
                      href="https://en.wiktionary.org/wiki/${this
                        .#word}#English"
                      >${this.#word}</a
                    >
                    in ${this.#attempts.length}
                    ${this.#attempts.length === 1 ? 'turn' : 'turns'}
                  </p>`
                : html`<p class="failure">
                    This player failed to solve
                    <a
                      target="_blank"
                      href="https://en.wiktionary.org/wiki/${this
                        .#word}#English"
                      >${this.#word}</a
                    >
                  </p>`
              : this.#result === 'redundant'
              ? html`<p class="redundant">Try a new word</p>`
              : this.#result === 'invalid'
              ? html`<p class="invalid">Not on the list</p>`
              : html`<p class="blank">...</p>`
            : ''
        }
        ${
          this.#mode === 'solve'
            ? this.#ended
              ? this.#success
                ? html`<p class="success">
                    You got it, it's
                    <a
                      target="_blank"
                      href="https://en.wiktionary.org/wiki/${this
                        .#word}#English"
                      >${this.#word}</a
                    >!
                  </p>`
                : html`<p class="failure">Better luck next time!</p>`
              : this.#result === 'redundant'
              ? html`<p class="redundant">Try a new word</p>`
              : this.#result === 'invalid'
              ? html`<p class="invalid">Not on the list</p>`
              : html`<p class="blank">...</p>`
            : ''
        }
      </div>

      <yawdle-keyboard
        .interactive=${!this.#ended}
        enterLabel=${this.#mode === 'solve' ? 'submit' : 'reveal'}
        @yawdleKey=${(event: CustomEvent) => this.#handleKey(event.detail)}
        class=${this.#mode}
      ></yawdle-keyboard>
    `
  }
}
