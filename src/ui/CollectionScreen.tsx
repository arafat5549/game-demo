import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Question, ThemeId } from '../types'
import { THEMES, MINI_GAMES, miniGameCardId } from '../data/themes'
import { QUESTIONS } from '../data/questions'
import { useSave } from '../store/save'
import { playClick } from '../audio/sfx'
import { ExpansionScreen } from './ExpansionScreen'

interface Props {
  theme: ThemeId
  onBack: () => void
}

/** 卡片图鉴（ADR-0004 / ADR-0012）：题卡 + 奖牌卡；点卡片进知识扩展页（ADR-0013） */
export function CollectionScreen({ theme, onBack }: Props) {
  const { save } = useSave()
  const [showExp, setShowExp] = useState<Question | null>(null)
  const meta = THEMES[theme]
  const prog = save.themeProgress[theme]
  const questions = QUESTIONS[theme]
  const collected = new Set(prog.collectedCardIds)

  return (
    <div className={`min-h-screen ${meta.mapBg} pb-10`}>
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
        <h1 className="text-xl font-black text-slate-700">📖 {meta.name}图鉴</h1>
        <div className="rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-slate-600 shadow">
          {collected.size}/{questions.length}
        </div>
      </div>

      {/* 小游戏卡 + 奖牌卡 */}
      <div className="mx-auto mt-4 grid w-full max-w-md grid-cols-3 gap-2 px-4">
        <div
          className={`flex flex-col items-center rounded-2xl border-4 p-2.5 shadow ${
            collected.has(miniGameCardId(theme)) ? 'border-violet-300 bg-violet-50' : 'border-slate-300 bg-slate-200'
          }`}
        >
          <div className="text-3xl">
            {collected.has(miniGameCardId(theme)) ? MINI_GAMES.find((m) => m.theme === theme)?.emoji ?? '🎮' : '❓'}
          </div>
          <div className="mt-1 text-center text-[11px] font-bold leading-tight text-slate-700">小游戏卡</div>
          <div className="text-[10px] text-slate-500">首通小游戏</div>
        </div>
        <div
          className={`flex flex-col items-center rounded-2xl border-4 p-2.5 shadow ${
            prog.medal ? 'border-yellow-300 bg-yellow-50' : 'border-slate-300 bg-slate-200'
          }`}
        >
          <div className="text-3xl">{prog.medal ? '🏅' : '❓'}</div>
          <div className="mt-1 text-center text-[11px] font-bold leading-tight text-slate-700">主题奖牌卡</div>
          <div className="text-[10px] text-slate-500">爬完 10 关</div>
        </div>
        <div
          className={`flex flex-col items-center rounded-2xl border-4 p-2.5 shadow ${
            prog.goldMedal ? 'border-yellow-300 bg-yellow-50' : 'border-slate-300 bg-slate-200'
          }`}
        >
          <div className="text-3xl">{prog.goldMedal ? '🥇' : '❓'}</div>
          <div className="mt-1 text-center text-[11px] font-bold leading-tight text-slate-700">金色奖牌卡</div>
          <div className="text-[10px] text-slate-500">10 关全 3 星</div>
        </div>
      </div>

      {/* 题卡网格 */}
      <div className="mx-auto mt-4 grid w-full max-w-md grid-cols-3 gap-3 px-4">
        {questions.map((q, i) => {
          const has = collected.has(q.id)
          return (
            <motion.button
              key={q.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              disabled={!has}
              onClick={() => {
                if (has) {
                  playClick()
                  setShowExp(q)
                }
              }}
              className={`flex flex-col items-center rounded-2xl border-4 p-2.5 shadow ${
                has
                  ? 'border-yellow-300 bg-white'
                  : 'border-slate-300 bg-slate-200 opacity-70'
              }`}
            >
              <div className="text-3xl">{has ? q.cardEmoji : '❓'}</div>
              <div className="mt-1 text-center text-[11px] font-bold leading-tight text-slate-700">
                {has ? q.cardName : '？？？'}
              </div>
            </motion.button>
          )
        })}
      </div>

      <p className="mx-auto mt-6 max-w-sm px-4 text-center text-xs text-slate-500">
        过关就能翻开新卡片；点已收集的卡片可以看它的知识扩展页 📖
      </p>

      {/* 知识扩展覆盖层（ADR-0013） */}
      {showExp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <ExpansionScreen
            theme={theme}
            question={showExp}
            onBack={() => setShowExp(null)}
          />
        </div>
      )}
    </div>
  )
}
