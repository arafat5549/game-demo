import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { ManifestOptions } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// 从版本文件读取版本号（格式 X.YYY，由 .githooks/pre-commit 自动维护）
const { version: appVersion } = JSON.parse(
  readFileSync(new URL('./src/version.json', import.meta.url), 'utf-8'),
) as { version: string }

export default defineConfig({
  // GitHub Pages 部署在 /game-demo/ 子路径；本地/Vercel 用根路径
  base: process.env.GITHUB_ACTIONS ? '/game-demo/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png'],
      manifest: {
        name: '知识卡牌大冒险',
        short_name: '知识卡牌',
        description: '给 2 年级小朋友的知识卡片闯关游戏：汽车 / 中国历史 / 我的世界',
        lang: 'zh-CN',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        version: appVersion,
      } as ManifestOptions & { version: string },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,png,svg,ico,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
