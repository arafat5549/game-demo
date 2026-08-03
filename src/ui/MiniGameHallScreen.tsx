import { motion } from 'framer-motion'
import type { ThemeId } from '../types'
import { MINI_GAMES, THEMES } from '../data/themes'
import { useSave } from '../store/save'
import { playClick } from '../audio/sfx'

interface Props {
  onBack: () => void
  onPlay: (theme: ThemeId) => void
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
          const unlocked = save.themeProgress[mg.theme].medal
          const best = save.miniGames[mg.theme].bestStars
          return (
            <motion.button
              key={mg.theme}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              disabled={!unlocked}
              onClick={() => {
                playClick()
                onPlay(mg.theme)
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
                    : `🔒 通关${THEMES[mg.theme].name}解锁`}
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
