self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(cacheName).then(function (cache) {
      return cache.addAll([
        '/index.html',
        '/index.css',
        '/index.js',
        '/src/favicon.svg',
        '/src/game.ts',
        '/src/game.ts',
        '/src/keyboard.ts',
        '/src/letter.ts',
        '/src/sleep.ts',
        '/src/word.ts',
        '/src/words.txt',
      ])
    }),
  )
})
