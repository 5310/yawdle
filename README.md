# [Yawdle!][1]

> Yet Another Wordle DupLicatE!

This is one of the many [Wordle][3] clones that popped up as soon as 2022 began. 

We made Yawdle primarily because us Wordlers were spread across timezones and didn't want to be half a day late to get to a new puzzle!

Yawdle does this by picking the puzzle word from a list of words—much like Wordle itself does. 
But instead of using a player's local date, it just uses arbitrary seeds to randomly pick the word. 
And also unlike Wordle, we only have one large list of words, but we pick words that tend to be more common, 
with the whole list still being a possibility. It's a tiny bit more "exciting" :D

Once we got that working, we ended up adding more features like sharing encrypted attempts like [Werdle][4], 
a [Wiktionary][5] link to the puzzle word, and full offline support!

---

There's also an "API" if you want to try your hand at making a programmatic solver for the game, right there in your browser's console!

- The game instance, a web-component, is exposed as the global variable `yawdle`

- To make an attempt, do: 

    ```js 
    yawdle.makeAttempt('rants')
    ```

  - If it's valid it'll give you a breakdown like: 

    ```js
    [ 
      { letter: 'r', state: 'wrong'}, 
      { letter: 'a', state: 'exact'}, 
      { letter: 'n', state: 'partial'}, 
      { letter: 't', state: 'wrong'}, 
      { letter: 's', state: 'wrong'}, 
    ]
    ```

    You'll have to track your own number of gusses out of the six.

  - If invalid, it'll return `null`. 
    
    Words already attempted would count as invalid.

- Optionally, if you want to get fancy with your solver and make it pretend it's typing out words one letter at a time, or changing its mind before submitting, you can enter an attempt without submitting: 

  ```js
  yawdle.makeAttempt('rants', false)
  ```
    

[1]: https://yawdle.scio.space/
[2]: https://github.com/5310/yawdle
[3]: https://www.powerlanguage.co.uk/wordle/
[4]: https://demoman.net/etcetera/werdle
[5]: https://en.wiktionary.org/wiki/wordle