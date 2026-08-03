import { useState } from 'react'
import { motion } from 'framer-motion'
import type { LevelNode, ThemeId } from '../types'
import { THEMES, levelTree } from '../data/themes'
import { useSave } from '../store/save'
import { playClick } from '../audio/sfx'

interface Props {
  theme: ThemeId
  onBack: () => void
  onEnterLevel: (theme: ThemeId, node: LevelNode) => void
  onOpenCollection: () => void
}

/** 杀戮尖塔式纵向爬塔关卡图（ADR-0012） */
export function ThemeMapScreen({ theme, onBack, onEnterLevel, onOpenCollection }: Props) {
  const { save } = useSave()
  const [shakeIndex, setShakeIndex] = useState<number | null>(null)
  const meta = THEMES[theme]
  const prog = save.themeProgress[theme]
  const nodes = levelTree(theme)

  const currentIndex = (() => {
    for (let i = 1; i <= 10; i++) {
      if (!prog.clearedLevels.includes(i)) return i
    }
    return null
  })()

  const nodeEmoji = (node: LevelNode) => {
    if (node.type === 'review') {
      return prog.mistakePool.length > 0 ? '🔁' : '💰' // 池空变宝藏关
    }
    return node.emoji
  }

  const handleClick = (node: LevelNode) => {
    const cleared = prog.clearedLevels.includes(node.index)
    if (cleared || node.index === currentIndex) {
      playClick()
      onEnterLevel(theme, node)
      return
    }
    // 锁定节点：抖动提示
    setShakeIndex(node.index)
    setTimeout(() => setShakeIndex(null), 500)
  }

  return (
    <div className={`min-h-screen ${meta.mapBg} pb-10`}>
      {/* 顶部栏 */}
      <div className="mx-auto flex max-w-md items-center justify-between px-4 pt-4">
        <button
          onClick={() => {
            playClick()
            onBack()
          }}
          className="rounded-full bg-white/80 px-4 py-1.5 font-bold text-slate-600 shadow"
        >
          ← 返回
        </button>
        <h1 className="text-xl font-black text-slate-700">
          {meta.emoji} {meta.name}
        </h1>
        <button
          onClick={() => {
            playClick()
            onOpenCollection()
          }}
          className="rounded-full bg-white/80 px-3 py-1.5 font-bold text-slate-600 shadow"
        >
          📖 图鉴
        </button>
      </div>

      <div className="mx-auto mt-2 flex max-w-md items-center justify-center gap-4 text-sm font-bold text-slate-600">
        <span className="rounded-full bg-white/70 px-3 py-1">⭐ {save.stars}</span>
        <span className="rounded-full bg-white/70 px-3 py-1">
          🧠 错题 {prog.mistakePool.length} 题
        </span>
      </div>

      {/* 爬塔图：终点奖牌在最上，第 1 关在最下 */}
      <div className="mx-auto mt-6 flex max-w-xs flex-col items-center">
        {/* 奖牌终点 */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-yellow-300 bg-gradient-to-br from-yellow-200 to-amber-300 text-4xl shadow-lg ${
            prog.medal ? '' : 'opacity-50 grayscale'
          }`}
          title="通关奖牌"
        >
          {prog.goldMedal ? '🥇' : '🏅'}
        </motion.div>
        <div className="text-xs font-bold text-slate-600">
          {prog.medal ? '通关奖牌' : '爬塔终点'}
        </div>

        {/* 节点（倒序渲染：10 → 1） */}
        {[...nodes].reverse().map((node) => {
          const cleared = prog.clearedLevels.includes(node.index)
          const isCurrent = node.index === currentIndex
          const locked = !cleared && !isCurrent
          const stars = prog.starsPerLevel[node.index] ?? 0
          const reviewPos = node.type === 'review'
          return (
            <div key={node.index} className="flex flex-col items-center">
              <div className={`h-8 w-1.5 ${reviewPos ? 'bg-amber-400' : 'bg-white/60'}`} />
              <motion.button
                animate={shakeIndex === node.index ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                onClick={() => handleClick(node)}
                className="group relative flex flex-col items-center"
              >
                <div className="relative">
                  {/* 玩家小人 */}
                  {isCurrent && (
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl"
                    >
                      🧒
                    </motion.div>
                  )}
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full border-4 text-3xl shadow-lg transition ${
                      cleared
                        ? `border-white ${meta.nodeBg} text-white`
                        : isCurrent
                          ? `border-yellow-300 ${meta.nodeBg} text-white ring-4 ring-yellow-200`
                          : 'border-slate-300 bg-slate-300 text-slate-400 grayscale'
                    }`}
                  >
                    {nodeEmoji(node)}
                    {locked && (
                      <span className="absolute -bottom-1 -right-1 text-xl drop-shadow">🔒</span>
                    )}
                  </div>
                  {/* 星级 */}
                  {stars > 0 && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs drop-shadow">
                      {'⭐'.repeat(stars)}
                    </div>
                  )}
                </div>
                <div
                  className={`mt-2 max-w-28 text-center text-sm font-bold ${
                    locked ? 'text-slate-400' : 'text-slate-700'
                  }`}
                >
                  {node.index}. {node.title}
                  {reviewPos && (
                    <span className="ml-1 text-amber-600">
                      {prog.mistakePool.length > 0 ? '复习' : '宝藏'}
                    </span>
                  )}
                </div>
              </motion.button>
            </div>
          )
        })}
      </div>

      <p className="mx-auto mt-6 max-w-sm px-4 text-center text-xs text-slate-500">
        🔁 复习关：第 4、8 关（答对的错题会消失） · 💰 错题都清完就变成宝藏关
      </p>
    </div>
  )
}
