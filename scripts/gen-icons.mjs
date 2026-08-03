// 一次性脚本：生成 PWA 图标（纯 node 手写 PNG，无外部依赖，用完即删）
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

// ── PNG 编码 ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── 绘制 ──
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function sdRoundRect(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r)
  const qy = Math.abs(y - cy) - (hh - r)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r
}

/** 五角星命中（极坐标近似） */
function starHit(x, y, cx, cy, R, r) {
  const dist = Math.hypot(x - cx, y - cy)
  if (dist > R) return false
  let ang = Math.atan2(y - cy, x - cx) * (180 / Math.PI)
  ang = ((ang % 72) + 72) % 72
  return dist <= (Math.abs(ang - 36) <= 18 ? R : r)
}

/**
 * 绘制图标：紫蓝渐变背景 + 白色圆角卡片 + 黄色五角星 + 三个进度点
 * maskable: 内容缩进安全区（中心 75%），背景铺满
 */
function drawIcon(size, maskable) {
  const px = Buffer.alloc(size * size * 4)
  const s = maskable ? 0.75 : 1 // 安全区缩放
  const bgTop = [99, 102, 241] // #6366f1
  const bgBot = [168, 85, 247] // #a855f7
  // 卡片几何（按安全区缩放）
  const cardW = 340 * s
  const cardH = 430 * s
  const cardR = 44 * s
  const starCx = size / 2
  const starCy = size / 2 - 88 * s
  const starR = 112 * s
  const starR2 = 46 * s
  const dotY = size / 2 + 130 * s
  const dotR = 26 * s
  const dotXs = [size / 2 - 78 * s, size / 2, size / 2 + 78 * s]
  const dotColor = [125, 211, 252] // #7dd3fc

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // 背景渐变
      const t = y / size
      let r = bgTop[0] + (bgBot[0] - bgTop[0]) * t
      let g = bgTop[1] + (bgBot[1] - bgTop[1]) * t
      let b = bgTop[2] + (bgBot[2] - bgTop[2]) * t
      let a = 255
      // 卡片
      const card = sdRoundRect(x, y, size / 2, size / 2, cardW / 2, cardH / 2, cardR)
      if (card < 0) {
        r = 255; g = 255; b = 255
      } else if (card < 1) {
        const k = card // 边缘抗锯齿
        r = r + (255 - r) * (1 - k)
        g = g + (255 - g) * (1 - k)
        b = b + (255 - b) * (1 - k)
      }
      // 星星
      if (starHit(x, y, starCx, starCy, starR, starR2)) {
        r = 251; g = 191; b = 36 // #fbbf24
      }
      // 进度点
      for (const dx of dotXs) {
        const d = Math.hypot(x - dx, y - dotY) - dotR
        if (d < 0) {
          r = dotColor[0]; g = dotColor[1]; b = dotColor[2]
        } else if (d < 1) {
          const k = d
          r = r + (dotColor[0] - r) * (1 - k)
          g = g + (dotColor[1] - g) * (1 - k)
          b = b + (dotColor[2] - b) * (1 - k)
        }
      }
      px[i] = clamp(r, 0, 255)
      px[i + 1] = clamp(g, 0, 255)
      px[i + 2] = clamp(b, 0, 255)
      px[i + 3] = a
    }
  }
  return encodePng(size, px)
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', drawIcon(192, false))
writeFileSync('public/icons/icon-512.png', drawIcon(512, false))
writeFileSync('public/icons/icon-512-maskable.png', drawIcon(512, true))
console.log('✓ public/icons/icon-192.png (192×192)')
console.log('✓ public/icons/icon-512.png (512×512)')
console.log('✓ public/icons/icon-512-maskable.png (512×512 maskable)')
