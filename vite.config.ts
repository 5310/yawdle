import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VitePWA({
      includeAssets: ['robots.txt', 'favicon.svg'],
      manifest: {
        name: 'Yawdle',
        short_name: 'Yet Another Wordle DupLicatE',
        description: 'Yet Another Wordle DupLicatE',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'favicon@192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'favicon@512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'favicon@512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  build: {
    assetsInlineLimit: 0,
  },
})
