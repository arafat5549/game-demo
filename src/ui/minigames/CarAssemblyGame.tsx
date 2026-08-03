import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ThemeId } from '../../types'
import { MINI_GAMES, THEMES } from '../../data/themes'
import { useSave } from '../../store/save'
import { playClick, playCorrect, playFanfare } from '../../audio/sfx'
import { GameResultOverlay } from './GameResultOverlay'

interface Props {
  theme: ThemeId
  onExit: () => void
}

type Part = 'body' | 'wheel' | 'light'
type Pos = 'body' | 'wheelL' | 'wheelR' | 'lightL' | 'lightR'

const POS_ORDER: Pos[] = ['body', 'wheelL', 'wheelR', 'lightL', 'lightR']
const POS_PART: Record<Pos, Part> = {
  body: 'body', wheelL: 'wheel', wheelR: 'wheel', lightL: 'light', lightR: 'light',
}

/** 🚗 汽车组装（ADR-0014）：点零件 → 点虚线位置安装 */
export function CarAssemblyGame({ theme, onExit }: Props) {
  const { save, applyMiniGameResult } = useSave()
  const [selected, setSelected] = useState<Part | null>(null)
  const [installed, setInstalled] = useState<Record<Pos, boolean>>({
    body: false, wheelL: false, wheelR: false, lightL: false, lightR: false,
  })
  const [done, setDone] = useState(false)
  const [stars, setStars] = useState(0)
  const startRef = useRef(Date.now())
  const installedCount = POS_ORDER.filter((p) => installed[p]).length
  const mini = MINI_GAMES.find((m) => m.id === theme)!
  const firstTime = !save.miniGames[theme].played

  const wheelsLeft = 2 - (installed.wheelL ? 1 : 0) - (installed.wheelR ? 1 : 0)
  const lightsLeft = 2 - (installed.lightL ? 1 : 0) - (installed.lightR ? 1 : 0)

  const handlePos = (pos: Pos) => {
    if (done || installed[pos] || !selected || POS_PART[pos] !== selected) return
    const next = { ...installed, [pos]: true }
    setInstalled(next)
    playCorrect()
    if (POS_ORDER.every((p) => next[p])) {
      // 全部装完
      const secs = (Date.now() - startRef.current) / 1000
      const s = secs <= 20 ? 3 : secs <= 45 ? 2 : 1
      setStars(s)
      setDone(true)
      playFanfare()
      applyMiniGameResult(theme, s)
    }
  }

  const partBtn = (part: Part, label: string, left: number, emoji: string) => (
    <button
      key={part}
      onClick={() => {
        playClick()
        setSelected(selected === part ? null : part)
      }}
      disabled={left <= 0 || done}
      className={`flex flex-col items-center rounded-2xl border-4 px-5 py-2.5 shadow transition active:scale-90 disabled:opacity-40 ${
        selected === part
          ? 'border-yellow-400 bg-yellow-50'
          : 'border-white bg-white'
      }`}
    >
      <span className="text-3xl">{emoji}</span>
      <span className="text-xs font-bold text-slate-600">
        {label} {left > 0 ? `×${left}` : '✓'}
      </span>
    </button>
  )

  const posBox = (pos: Pos, cls: string, content?: ReactNode) => (
    <button
      onClick={() => handlePos(pos)}
      className={`absolute ${cls} flex items-center justify-center rounded-2xl border-4 border-dashed transition ${
        installed[pos]
          ? 'border-transparent'
          : selected === POS_PART[pos]
            ? 'border-yellow-400 bg-yellow-50/60 scale-105'
            : 'border-slate-400 bg-white/40'
      }`}
    >
      {installed[pos] ? content : ''}
    </button>
  )

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-amber-400 to-orange-500 px-4 pb-8">
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
        <h1 className="text-xl font-black text-white drop-shadow">🚗 汽车组装</h1>
        <div className="rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-slate-600 shadow">
          完成 {installedCount}/5
        </div>
      </div>

      <p className="mx-auto mt-2 max-w-md text-center text-sm font-bold text-white/90">
        先点下面的零件，再点车上的虚线位置装上去
      </p>

      {/* 装配区 */}
      <div className="relative mx-auto mt-4 h-72 w-full max-w-md rounded-3xl bg-gradient-to-b from-sky-200 to-sky-100 shadow-inner">
        {/* 车灯 */}
        {posBox('lightL', 'left-8 top-8 h-12 w-12', <div className="h-8 w-8 rounded-full bg-yellow-300 shadow" />)}
        {posBox('lightR', 'right-8 top-8 h-12 w-12', <div className="h-8 w-8 rounded-full bg-yellow-300 shadow" />)}
        {/* 车身 */}
        {posBox(
          'body',
          'left-1/2 top-1/2 h-32 w-56 -translate-x-1/2 -translate-y-[55%]',
          <div className="flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-b from-red-400 to-red-600 text-6xl shadow-lg">
            🚙
          </div>,
        )}
        {/* 轮子 */}
        {posBox('wheelL', 'left-14 bottom-8 h-16 w-16', <div className="h-14 w-14 rounded-full bg-slate-800 shadow-lg ring-4 ring-slate-500" />)}
        {posBox('wheelR', 'right-14 bottom-8 h-16 w-16', <div className="h-14 w-14 rounded-full bg-slate-800 shadow-lg ring-4 ring-slate-500" />)}
      </div>

      {/* 零件区 */}
      <div className="mx-auto mt-4 flex w-full max-w-md justify-center gap-3">
        {partBtn('body', '车身', installed.body ? 0 : 1, '🚙')}
        {partBtn('wheel', '轮子', wheelsLeft, '⚫')}
        {partBtn('light', '车灯', lightsLeft, '🟡')}
      </div>

      {done && (
        <GameResultOverlay
          gradient={THEMES[theme].gradient}
          emoji={mini.emoji}
          cardHint={firstTime ? '小游戏卡' : null}
          stars={stars}
          onRetry={() => {
            setInstalled({ body: false, wheelL: false, wheelR: false, lightL: false, lightR: false })
            setSelected(null)
            setDone(false)
            startRef.current = Date.now()
          }}
          onExit={onExit}
        />
      )}
    </div>
  )
}
