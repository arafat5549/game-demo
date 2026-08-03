import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LevelNode, LevelResult, Question, ThemeId } from '../types'
import { computeResult } from '../game/engine'
import { useSave } from '../store/save'
import { playClick, playCorrect, playFanfare, playWrong } from '../audio/sfx'
import { speak, stopSpeaking } from '../audio/tts'
import { ExpansionScreen } from './ExpansionScreen'
import { DIFFICULTIES } from '../data/themes'

interface Props {
  theme: ThemeId
  node: LevelNode
  questions: Question[]
  onFinish: (theme: ThemeId, node: LevelNode, result: LevelResult) => void
  onAbort: () => void
}

export function QuizScreen({ theme, node, questions, onFinish, onAbort }: Props) {
  const { save, applyLevelResult } = useSave()
  const muted = save.settings.muted
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongIds, setWrongIds] = useState<string[]>([])
  const [correctIds, setCorrectIds] = useState<string[]>([])
  const [combo, setCombo] = useState(0)
  const [showCombo, setShowCombo] = useState(false)
  const [learning, setLearning] = useState(false)
  const [showExp, setShowExp] = useState<Question | null>(null)
  const finishedRef = useRef(false)

  const q = questions[qIndex]
  const total = questions.length
  const last = qIndex >= total - 1

  // 进入新题自动朗读（2 年级识字量有限，见 ADR-0003）
  useEffect(() => {
    if (!muted && q) speak(q.prompt)
    return () => stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex])

  if (!q) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        这道关还没有题目，先玩别的关吧。
      </div>
    )
  }

  const nextOrFinish = () => {
    stopSpeaking()
    if (last) {
      if (finishedRef.current) return
      finishedRef.current = true
      const { passed, stars, bonusStars } = computeResult(
        correctCount,
        node.type === 'treasure',
      )
      const result: LevelResult = {
        levelIndex: node.index,
        nodeType: node.type,
        passed,
        correct: correctCount,
        total,
        stars,
        bonusStars,
        wrongQuestionIds: wrongIds,
        correctQuestionIds: correctIds,
        unlockedCardIds: passed ? questions.map((x) => x.id) : [],
      }
      applyLevelResult(theme, result)
      // 修复：最后一题完成始终进结算页（星星/卡片动画），不再跳关
      onFinish(theme, node, result)
      return
    }
    setQIndex(qIndex + 1)
    setSelected(null)
    setLearning(false)
  }

  const handleSelect = (i: number) => {
    if (selected !== null || learning) return
    setSelected(i)
    const isCorrect = i === q.answer
    if (isCorrect) {
      playCorrect()
      setCorrectCount(correctCount + 1)
      setCorrectIds([...correctIds, q.id])
      const newCombo = combo + 1
      setCombo(newCombo)
      if (newCombo >= 3) {
        setShowCombo(true)
        playFanfare()
        setTimeout(() => setShowCombo(false), 1200)
      }
      // 答对：停住展示反馈，孩子可"了解更多"或继续（ADR-0013）
    } else {
      playWrong()
      setCombo(0)
      setWrongIds([...wrongIds, q.id])
      // 学习时刻：展示正确答案 + 知识小故事（ADR-0007）
      setLearning(true)
      setTimeout(() => {
        if (!muted) speak(q.fact)
      }, 400)
    }
  }

  const optionClass = (i: number) => {
    const base =
      'flex items-center justify-center rounded-2xl border-4 px-3 py-5 text-xl font-black shadow-lg transition active:scale-95'
    if (selected === null) {
      return `${base} border-white bg-white text-slate-700 hover:bg-slate-50`
    }
    if (i === q.answer) {
      return `${base} border-green-400 bg-green-100 text-green-700`
    }
    if (i === selected) {
      return `${base} border-red-400 bg-red-100 text-red-600`
    }
    return `${base} border-slate-200 bg-slate-100 text-slate-400`
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-indigo-400 to-sky-300 px-4 pb-6">
      {/* 顶部：退出 + 进度 + 连击 */}
      <div className="mx-auto flex w-full max-w-md items-center justify-between pt-4">
        <button
          onClick={() => {
            playClick()
            stopSpeaking()
            onAbort()
          }}
          className="rounded-full bg-white/80 px-4 py-1.5 font-bold text-slate-600 shadow"
        >
          ✕ 退出
        </button>
        <div className="text-center">
          <div className="text-lg font-black leading-tight text-white drop-shadow">
            第 {qIndex + 1} / {total} 题
          </div>
          {/* 当前爬塔层级名（node.title，明确在哪一层） */}
          <div className="text-xs font-bold text-white/90 drop-shadow">
            {node.emoji} {node.title} · 第 {node.index} 关
          </div>
        </div>
        <div className="w-20 text-right text-lg font-black text-yellow-200 drop-shadow">
          {combo >= 2 ? `🔥${combo}` : ''}
        </div>
      </div>

      {/* 进度条 */}
      <div className="mx-auto mt-3 flex w-full max-w-md gap-1.5">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-2.5 flex-1 rounded-full ${
              i < qIndex
                ? 'bg-yellow-300'
                : i === qIndex
                  ? 'bg-white'
                  : 'bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* 连击特效 */}
      <AnimatePresence>
        {showCombo && (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1.3, rotate: 0 }}
            exit={{ scale: 0 }}
            className="mx-auto mt-3 rounded-full bg-orange-500 px-6 py-2 text-xl font-black text-white shadow-xl"
          >
            🔥 连击 ×{combo}！
          </motion.div>
        )}
      </AnimatePresence>

      {/* 全局难度标识 + 回退提示（ADR-0016） */}
      {(() => {
        const g = DIFFICULTIES.find((d) => d.id === save.settings.difficulty)
        const hasFallback = questions.some((q) => q.difficulty !== save.settings.difficulty)
        return (
          <div className="mx-auto mt-2 flex w-full max-w-md flex-wrap items-center justify-center gap-1.5 text-xs font-bold">
            <span className={`rounded-full border-2 px-2.5 py-0.5 shadow-sm ${g?.color ?? 'border-slate-300 bg-slate-100 text-slate-600'}`}>
              {g?.emoji} 难度：{g?.label}
            </span>
            {hasFallback && (
              <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-slate-500 shadow-sm">
                ℹ️ 本关含相邻难度题（{g?.label}题库补充中）
              </span>
            )}
          </div>
        )
      })()}

      {/* 题目卡片 */}
      <div className="mx-auto mt-4 w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div className="text-center text-4xl">{q.cardEmoji}</div>
          <h2 className="flex-1 text-center text-2xl font-black leading-snug text-slate-800">
            {q.prompt}
          </h2>
          <button
            aria-label="朗读题目"
            onClick={() => speak(q.prompt)}
            className="rounded-full bg-sky-100 p-2 text-xl"
          >
            🔊
          </button>
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span className={`rounded-full border-2 px-2 py-0.5 font-bold ${
            DIFFICULTIES.find((d) => d.id === q.difficulty)?.color ?? 'border-slate-200 bg-slate-100 text-slate-500'
          }`}>
            {DIFFICULTIES.find((d) => d.id === q.difficulty)?.emoji}{' '}
            {DIFFICULTIES.find((d) => d.id === q.difficulty)?.label ?? q.difficulty}
          </span>
          {/* 当前题目卡片名 */}
          <span>📖 {q.cardName}</span>
        </div>
      </div>

      {/* 选项 */}
      <div className={`mx-auto mt-5 grid w-full max-w-md gap-3 ${q.type === 'judge' ? 'grid-cols-2' : 'grid-cols-2'}`}>
        {q.options.map((opt, i) => (
          <button
            key={i}
            disabled={selected !== null}
            onClick={() => handleSelect(i)}
            className={optionClass(i)}
          >
            {q.type === 'choice' && <span className="mr-2 text-slate-400">{'ABCD'[i]}.</span>}
            {opt}
          </button>
        ))}
      </div>

      {/* 答对反馈（停住，可了解更多或继续，ADR-0013） */}
      <AnimatePresence>
        {selected !== null && !learning && selected === q.answer && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mx-auto mt-5 w-full max-w-md rounded-3xl bg-green-50 p-5 shadow-xl ring-4 ring-green-300"
          >
            <div className="text-lg font-black text-green-700">✅ 答对了！真棒！</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  playClick()
                  setShowExp(q)
                }}
                className="rounded-full bg-sky-100 px-4 py-2 font-bold text-sky-700"
              >
                📖 了解更多
              </button>
              <button
                onClick={() => {
                  playClick()
                  nextOrFinish()
                }}
                className="flex-1 rounded-full bg-green-400 px-4 py-2 font-black text-white shadow"
              >
                {last ? '看结果' : '下一题 →'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 学习时刻 */}
      <AnimatePresence>
        {learning && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mx-auto mt-5 w-full max-w-md rounded-3xl bg-amber-50 p-5 shadow-xl ring-4 ring-amber-300"
          >
            <div className="text-lg font-black text-amber-700">
              💡 原来是这样！
            </div>
            <p className="mt-2 text-lg font-bold leading-relaxed text-slate-700">{q.fact}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => speak(q.fact)}
                className="rounded-full bg-amber-200 px-4 py-2 font-bold text-amber-800"
              >
                🔊 再听一遍
              </button>
              <button
                onClick={() => {
                  playClick()
                  setShowExp(q)
                }}
                className="rounded-full bg-sky-100 px-4 py-2 font-bold text-sky-700"
              >
                📖 了解更多
              </button>
              <button
                onClick={() => {
                  playClick()
                  nextOrFinish()
                }}
                className="flex-1 rounded-full bg-amber-400 px-4 py-2 font-black text-white shadow"
              >
                {last ? '看结果' : '下一题 →'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 知识扩展覆盖层（不打断答题状态，ADR-0013） */}
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
