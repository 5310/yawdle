import '/src/game.ts'

// TODO: Get service workers to work with Vite
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker
//       .register('sw.js')
//       .then((registration) => {
//         console.log('Service Worker is registered', registration)
//       })
//       .catch((err) => {
//         console.error('Registration failed:', err)
//       })
//   })
// }

self.yawdle = document.querySelector('yawdle-game')
