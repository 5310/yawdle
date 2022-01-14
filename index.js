import { registerSW } from 'virtual:pwa-register'
import '/src/game.ts'

const updateSW = registerSW({
  onNeedRefresh() {},
  onOfflineReady() {},
})

self.yawdle = document.querySelector('yawdle-game')
