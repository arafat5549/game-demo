import { motion } from 'framer-motion'
import type { ThemeId } from '../../types'
import { THEMES } from '../../data/themes'
import { useSave } from '../../store/save'
import { playClick, playFanfare, playStar } from '../../audio/sfx'

interface Props {
  theme: ThemeId
  stars: number
  onRetry: () => void
  onExit: () => void
}

/** 小游戏结算弹层（ADR-0014）：星级 + 首通送卡提示 */
export function GameResultOverlay({ theme, stars, onRetry, onExit }: Props) {
  const { save } = useSave()
  const meta = THEMES[theme]
  const firstTime = !save.miniGames[theme].played

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className={`w-full max-w-sm rounded-3xl bg-gradient-to-b ${meta.gradient} p-6 text-center shadow-2xl`}
      >
        <div className="text-2xl font-black text-white drop-shadow">小游戏完成！</div>
        <div className="mt-3 flex items-center justify-center gap-2">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: i <= stars ? 1 : 0.85, opacity: i <= stars ? 1 : 0.3 }}
              transition={{ delay: 0.2 + i * 0.18, type: 'spring', stiffness: 300 }}
              onAnimationComplete={() => {
                if (i === stars) {
                  playFanfare()
                  if (stars > 0) playStar()
                }
              }}
              className="text-5xl drop-shadow"
            >
              ⭐
            </motion.div>
          ))}
        </div>
        {firstTime && (
          <div className="mt-3 rounded-2xl bg-white/90 px-4 py-2 text-sm font-black text-amber-600 shadow">
            🎁 新卡片入图鉴：{meta.emoji} 小游戏卡
          </div>
        )}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              playClick()
              onRetry()
            }}
            className="flex-1 rounded-full bg-white px-4 py-3 text-lg font-black text-slate-700 shadow-xl active:scale-95"
          >
            🔄 再玩一次
          </button>
          <button
            onClick={() => {
              playClick()
              onExit()
            }}
            className="flex-1 rounded-full bg-white/70 px-4 py-3 text-lg font-bold text-slate-600 shadow active:scale-95"
          >
            小游戏厅 →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
