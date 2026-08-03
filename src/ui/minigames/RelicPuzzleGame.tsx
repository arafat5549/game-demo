import { useState } from 'react'
import type { ThemeId } from '../../types'
import { useSave } from '../../store/save'
import { playClick, playCorrect, playFanfare } from '../../audio/sfx'
import { shuffle } from '../../data/questions'
import { GameResultOverlay } from './GameResultOverlay'

interface Props {
  theme: ThemeId
  onExit: () => void
}

const SIZE = 2 // 2×2 拼图（4 块，2 年级友好）
const CELL = 120

function newTiles(): number[] {
  let t = [0, 1, 2, 3]
  while (t.every((v, i) => v === i)) t = shuffle(t)
  return t
}

/** 🏯 文物拼图（ADR-0014）：点选一块，再点另一块交换 */
export function RelicPuzzleGame({ theme, onExit }: Props) {
  const { applyMiniGameResult } = useSave()
  const [tiles, setTiles] = useState<number[]>(() => newTiles())
  const [selected, setSelected] = useState<number | null>(null)
  const [moves, setMoves] = useState(0)
  const [done, setDone] = useState(false)
  const [stars, setStars] = useState(0)

  const handleTile = (idx: number) => {
    if (done) return
    if (selected === null) {
      setSelected(idx)
      playClick()
      return
    }
    if (selected === idx) {
      setSelected(null)
      playClick()
      return
    }
    // 交换
    const next = [...tiles]
    ;[next[selected], next[idx]] = [next[idx], next[selected]]
    setTiles(next)
    setSelected(null)
    const m = moves + 1
    setMoves(m)
    if (next.every((v, i) => v === i)) {
      const s = m <= 8 ? 3 : m <= 20 ? 2 : 1
      setStars(s)
      setDone(true)
      playFanfare()
      applyMiniGameResult(theme, s)
    } else {
      playCorrect()
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-500 to-teal-600 px-4 pb-8">
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
        <h1 className="text-xl font-black text-white drop-shadow">🏺 文物拼图</h1>
        <div className="rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-slate-600 shadow">
          {done ? '完成！' : `步数 ${moves}`}
        </div>
      </div>

      <p className="mx-auto mt-2 max-w-md text-center text-sm font-bold text-white/90">
        先点一块拼图，再点另一块交换位置，拼出古代宝贝
      </p>

      {/* 拼图板 */}
      <div
        className="mx-auto mt-6 grid grid-cols-2 overflow-hidden rounded-3xl shadow-2xl"
        style={{ width: SIZE * CELL, height: SIZE * CELL }}
      >
        {tiles.map((tileId, idx) => {
          const tx = tileId % SIZE
          const ty = Math.floor(tileId / SIZE)
          return (
            <button
              key={idx}
              onClick={() => handleTile(idx)}
              className={`relative overflow-hidden transition ${
                selected === idx ? 'z-10 scale-95 ring-4 ring-yellow-300' : ''
              }`}
              style={{ width: CELL, height: CELL }}
            >
              {/* 完整画面，通过位移显示对应块 */}
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-200 to-orange-300"
                style={{
                  width: SIZE * CELL,
                  height: SIZE * CELL,
                  transform: `translate(${-tx * CELL}px, ${-ty * CELL}px)`,
                }}
              >
                <span className="text-[110px] drop-shadow-lg">🏺</span>
              </div>
            </button>
          )
        })}
      </div>

      {done && (
        <div className="mx-auto mt-5 w-full max-w-md rounded-2xl bg-white/90 p-3 text-center text-lg font-black text-teal-700 shadow">
          🎉 拼好啦！用了 {moves} 步
        </div>
      )}

      {done && (
        <GameResultOverlay
          theme={theme}
          stars={stars}
          onRetry={() => {
            setTiles(newTiles())
            setSelected(null)
            setMoves(0)
            setDone(false)
          }}
          onExit={onExit}
        />
      )}
    </div>
  )
}
