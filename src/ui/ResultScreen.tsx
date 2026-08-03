import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LevelNode, LevelResult, Question, ThemeId } from '../types'
import { THEMES } from '../data/themes'
import { questionForKnowledge } from '../game/engine'
import { useSave } from '../store/save'
import { playClick, playFanfare, playStar } from '../audio/sfx'

interface Props {
  theme: ThemeId
  node: LevelNode
  result: LevelResult
  onRetry: () => void
  onBack: () => void
  onNext: () => void
}

export function ResultScreen({ theme, node, result, onRetry, onBack, onNext }: Props) {
  const meta = THEMES[theme]
  const { save } = useSave()
  const [cardStep, setCardStep] = useState(0)
  const fanfarePlayed = useRef(false)
  const passed = result.passed

  // 过关解锁的知识点卡片（ADR-0017）：每知识点取代表题，随全局难度回退最近难度
  const cards = result.unlockedKnowledgeIds
    .map((k) => questionForKnowledge(theme, k, save.settings.difficulty))
    .filter((q): q is Question => Boolean(q))

  // 过关：星星逐个弹入 + 卡片逐张翻开
  useEffect(() => {
    if (!passed) return
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < result.stars; i++) {
      timers.push(setTimeout(() => playStar(), 500 + i * 550))
    }
    if (!fanfarePlayed.current) {
      fanfarePlayed.current = true
      timers.push(setTimeout(() => playFanfare(), 400))
    }
    const cardTimers: ReturnType<typeof setTimeout>[] = []
    cards.forEach((_, i) => {
      cardTimers.push(setTimeout(() => setCardStep(i + 1), 1400 + i * 550))
    })
    return () => {
      timers.forEach(clearTimeout)
      cardTimers.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`flex min-h-screen flex-col items-center bg-gradient-to-b ${meta.gradient} px-4 pb-10`}>
      <div className="mx-auto w-full max-w-md pt-8 text-center">
        <div className="text-3xl font-black text-white drop-shadow">
          {node.index}. {node.title}
        </div>

        {/* 过关 / 未过关 */}
        {passed ? (
          <>
            <div className="mt-6 flex items-center justify-center gap-2">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{
                    scale: i <= result.stars ? 1 : 0.9,
                    rotate: 0,
                    opacity: i <= result.stars ? 1 : 0.25,
                  }}
                  transition={{ delay: 0.3 + i * 0.2, type: 'spring', stiffness: 300 }}
                  className="text-6xl drop-shadow-lg"
                >
                  ⭐
                </motion.div>
              ))}
            </div>
            <div className="mt-3 text-2xl font-black text-yellow-100 drop-shadow">
              过关啦！全对 {result.correct}/{result.total} 题
            </div>
            {result.bonusStars > 0 && (
              <div className="mt-2 rounded-full bg-yellow-300 px-4 py-1 text-lg font-black text-amber-700 shadow">
                宝藏关全对，额外 +{result.bonusStars} ⭐！
              </div>
            )}

            {/* 卡片逐张翻开 */}
            <div className="mt-6">
              <div className="text-lg font-bold text-white/90">📖 新知识卡片</div>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {cards.map((q, i) => (
                  <motion.div
                    key={q.id}
                    initial={{ rotateY: 90, opacity: 0, scale: 0.6 }}
                    animate={{
                      rotateY: cardStep > i ? 0 : 90,
                      opacity: cardStep > i ? 1 : 0,
                      scale: cardStep > i ? 1 : 0.6,
                    }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                    className="flex h-28 w-20 flex-col items-center justify-center rounded-xl border-4 border-yellow-200 bg-white shadow-xl"
                  >
                    <div className="text-3xl">{cardStep > i ? q.cardEmoji : '❓'}</div>
                    <div className="mt-1 px-1 text-center text-[11px] font-bold leading-tight text-slate-700">
                      {cardStep > i ? q.cardName : '？'}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 奖牌 */}
            {node.index === 10 && (
              <div className="mt-5 rounded-2xl bg-yellow-200/90 px-5 py-3 text-xl font-black text-amber-700 shadow">
                🏅 爬完塔顶，拿到主题奖牌啦！
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mt-8 text-7xl">💪</div>
            <div className="mt-3 text-2xl font-black text-white drop-shadow">
              答对 {result.correct}/{result.total} 题
            </div>
            <p className="mt-2 text-lg text-white/90">再答对 {3 - result.correct} 题就能过关，加油！</p>
          </>
        )}

        {/* 按钮 */}
        <div className="mt-8 flex flex-col gap-3">
          {!passed && (
            <button
              onClick={() => {
                playClick()
                onRetry()
              }}
              className="rounded-full bg-white px-6 py-3 text-xl font-black text-slate-700 shadow-xl active:scale-95"
            >
              🔄 再试一次
            </button>
          )}
          {passed && node.index < 10 && (
            <button
              onClick={() => {
                playClick()
                onNext()
              }}
              className="rounded-full bg-white px-6 py-3 text-xl font-black text-slate-700 shadow-xl active:scale-95"
            >
              下一关就在塔上等你 ➡️
            </button>
          )}
          <button
            onClick={() => {
              playClick()
              onBack()
            }}
            className="rounded-full bg-white/70 px-6 py-3 text-lg font-bold text-slate-600 shadow active:scale-95"
          >
            {passed ? '回到关卡图' : '回关卡图'}
          </button>
        </div>

        {/* 未过关时也提示学习时刻回顾 */}
        <AnimatePresence>
          {!passed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-sm text-white/80"
            >
              答错的题已经放进错题池，复习关里会再见到它们 💡
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
