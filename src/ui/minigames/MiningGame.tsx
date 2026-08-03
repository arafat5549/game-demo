import { useEffect, useRef, useState } from 'react'
import type { ThemeId } from '../../types'
import { useSave } from '../../store/save'
import { playClick, playCorrect, playFanfare, playWrong } from '../../audio/sfx'
import { GameResultOverlay } from './GameResultOverlay'

interface Props {
  theme: ThemeId
  onExit: () => void
}

const ROWS = 3
const COLS = 4
const DURATION = 30 // 秒

type CellKind = 'diamond' | 'creeper' | 'stone'
type CellState = { kind: CellKind; dug: boolean }

function randomKind(): CellKind {
  const r = Math.random()
  return r < 0.34 ? 'diamond' : r < 0.5 ? 'creeper' : 'stone'
}

function newBoard(): CellState[] {
  return Array.from({ length: ROWS * COLS }, () => ({ kind: randomKind(), dug: false }))
}

/** 🧱 挖矿大作战（ADR-0014）：30 秒点钻石得分，点苦力怕扣分 */
export function MiningGame({ theme, onExit }: Props) {
  const { applyMiniGameResult } = useSave()
  const [board, setBoard] = useState<CellState[]>(() => newBoard())
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [done, setDone] = useState(false)
  const [stars, setStars] = useState(0)
  const scoreRef = useRef(score)
  scoreRef.current = score

  // 倒计时：每秒减 1，并刷新未挖的格子
  useEffect(() => {
    if (done) return
    const tick = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0))
      setBoard((b) => b.map((c) => (c.dug ? c : { kind: randomKind(), dug: false })))
    }, 1000)
    return () => clearInterval(tick)
  }, [done])

  // 时间到：结算（保底 1 星，ADR-0014）
  useEffect(() => {
    if (timeLeft > 0 || done) return
    const s = score >= 10 ? 3 : score >= 5 ? 2 : 1
    setStars(s)
    setDone(true)
    playFanfare()
    applyMiniGameResult(theme, s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, done])

  const handleCell = (idx: number) => {
    if (done || board[idx].dug) return
    const cell = board[idx]
    const next = [...board]
    next[idx] = { ...cell, dug: true }
    setBoard(next)
    if (cell.kind === 'diamond') {
      setScore(score + 1)
      playCorrect()
    } else if (cell.kind === 'creeper') {
      setScore(score - 1)
      playWrong()
    } else {
      playClick()
    }
  }

  const cellEmoji = (c: CellState) => {
    if (!c.dug) return '⬛'
    return c.kind === 'diamond' ? '💎' : c.kind === 'creeper' ? '💥' : '🪨'
  }

  const restart = () => {
    setBoard(newBoard())
    setScore(0)
    setTimeLeft(DURATION)
    setDone(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-lime-500 to-green-700 px-4 pb-8">
      <div className="mx-auto flex w-full max-w-md items-center justify-between pt-4">
        <button
          onClick={() => {
            playClick()
            onExit()
          }}
          className="rounded-full bg-white/80 px-4 py-1.5 font-bold text-slate-600 shadow"
        >
          ✕ 退出
        </button>
        <h1 className="text-xl font-black text-white drop-shadow">⛏️ 挖矿大作战</h1>
        <div className="rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-slate-600 shadow">
          ⏱ {timeLeft}s
        </div>
      </div>

      <div className="mx-auto mt-2 flex w-full max-w-md items-center justify-center">
        <div className="rounded-full bg-white/90 px-4 py-1.5 text-lg font-black text-slate-700 shadow">
          💎 得分：{score}
        </div>
      </div>

      <p className="mx-auto mt-2 max-w-md text-center text-sm font-bold text-white/90">
        快点钻石 💎 得分！小心苦力怕 💥，点它会扣分！
      </p>

      {/* 矿场 */}
      <div
        className="mx-auto mt-4 grid w-full max-w-md gap-2 rounded-3xl bg-slate-800 p-3 shadow-2xl"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleCell(idx)}
            disabled={done}
            className="flex aspect-square items-center justify-center rounded-xl bg-slate-700 text-4xl shadow-inner transition active:scale-90 disabled:opacity-80"
          >
            {cellEmoji(cell)}
          </button>
        ))}
      </div>

      {done && (
        <GameResultOverlay
          theme={theme}
          stars={stars}
          onRetry={restart}
          onExit={onExit}
        />
      )}
    </div>
  )
}
