import { motion } from 'framer-motion'
import type { MiniGameId, ThemeId } from '../types'
import { MINI_GAMES, THEMES } from '../data/themes'
import { useSave } from '../store/save'
import { playClick } from '../audio/sfx'

interface Props {
  onBack: () => void
  onPlay: (id: MiniGameId) => void
}

/**
 * 开发模式默认解锁全部小游戏（便于本地试玩，免通关）。
 * 关闭方式：项目根目录建 .env 文件，写 VITE_UNLOCK_MINI_GAMES=false
 */
function devUnlocked(): boolean {
  if (!import.meta.env.DEV) return false
  return import.meta.env.VITE_UNLOCK_MINI_GAMES !== 'false'
}

/** 小游戏厅选型界面（ADR-0014）：主题通关解锁对应小游戏 */
export function MiniGameHallScreen({ onBack, onPlay }: Props) {
  const { save } = useSave()

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-purple-300 to-fuchsia-300 px-4 pb-10">
      <div className="mx-auto flex max-w-md items-center justify-between pt-4">
        <button
          onClick={() => {
            playClick()
            onBack()
          }}
          className="rounded-full bg-white/80 px-4 py-1.5 font-bold text-slate-600 shadow"
        >
          ← 返回
        </button>
        <h1 className="text-2xl font-black text-white drop-shadow">🎮 小游戏厅</h1>
        <div className="w-20" />
      </div>

      <p className="mx-auto mt-2 max-w-md text-center text-sm text-white/90">
        通关主题世界就能解锁对应的小游戏，完成后送小游戏卡！
      </p>

      <div className="mx-auto mt-6 flex max-w-md flex-col gap-4">
        {MINI_GAMES.map((mg, i) => {
          // 解锁：主题小游戏 = 该主题通关；彩蛋小游戏（race）= 三主题全通关（ADR-0015）；dev 模式全解锁
          const allThemesCleared = (['car', 'history', 'minecraft'] as ThemeId[]).every(
            (t) => save.themeProgress[t].medal,
          )
          const unlocked = mg.theme
            ? save.themeProgress[mg.theme].medal || devUnlocked()
            : allThemesCleared || devUnlocked()
          const best = save.miniGames[mg.id].bestStars
          return (
            <motion.button
              key={mg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              disabled={!unlocked}
              onClick={() => {
                playClick()
                onPlay(mg.id)
              }}
              className={`relative flex items-center gap-4 rounded-3xl bg-gradient-to-r ${mg.gradient} p-5 text-left text-white shadow-xl transition active:scale-95 disabled:opacity-70`}
            >
              <div className="text-5xl drop-shadow">{mg.emoji}</div>
              <div className="flex-1">
                <div className="text-xl font-black drop-shadow">{mg.name}</div>
                <div className="text-sm text-white/90">{mg.description}</div>
                <div className="mt-1 text-xs text-white/75">
                  {unlocked
                    ? best > 0
                      ? `最佳 ${'⭐'.repeat(best)} · 可重玩`
                      : '已解锁 · 快来玩'
                    : mg.theme
                      ? `🔒 通关${THEMES[mg.theme].name}解锁`
                      : '🔒 通关全部主题解锁'}
                </div>
              </div>
              {unlocked && <div className="text-3xl">▶️</div>}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
