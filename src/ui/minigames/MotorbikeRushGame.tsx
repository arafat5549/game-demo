import { useEffect, useRef, useState } from 'react'
import { useSave } from '../../store/save'
import { playClick, playCorrect, playFanfare } from '../../audio/sfx'
import { GameResultOverlay } from './GameResultOverlay'

// ── 常量（单位：米 / 米每秒 / 秒）──
const TRACK = 3000 // 赛程总长
const CRUISE = 25 // 巡航速度
const BOOST = 33 // 按住「加油」速度
const AI_BASE = 27 // AI 基准速度（±3 波动）
const LANES = 3
const LANE_PCTS = [1 / 6, 1 / 2, 5 / 6] // 3 条车道中心（宽比例）
const ROAD_H = 460 // 赛道可视高度（px）
const BOTTOM_Y = ROAD_H - 44 // 玩家摩托的屏幕 Y（距容器顶 px）
const PPM = 1 // 像素 / 米（世界滚动比例）
const COLLIDE_DIST = 15 // 碰撞距离差阈值（米）
const SLIDE_SPEED = 7 // 切道滑动速度（车道/秒）
const AI_SLIDE_SPEED = 6 // AI 变道滑动速度
const AI_COLORS = ['bg-red-400/90', 'bg-blue-400/90', 'bg-green-400/90'] // AI 头环颜色

// ── 道具类型（生成时决定，所见即所得）──
type ItemKind = 'boost' | 'missile' | 'slow' | 'armor'
const ITEM_KINDS: ItemKind[] = ['boost', 'missile', 'slow', 'armor']
// 路上道具渲染映射：各图标 + 彩色发光圆底，与减速带（横条路障）彻底区分
const ITEM_META: Record<ItemKind, { emoji: string; bg: string }> = {
  boost: { emoji: '⚡', bg: 'bg-yellow-400/90' }, // 加速
  missile: { emoji: '🚀', bg: 'bg-red-500/90' }, // 导弹
  slow: { emoji: '❄️', bg: 'bg-blue-400/90' }, // 减速弹
  armor: { emoji: '🛡️', bg: 'bg-green-400/90' }, // 碰撞装甲
}

// ── 状态模型：全部可变状态放 ref，rAF 每帧推进 + setState 刷新 UI ──
interface PlayerState {
  lane: number // 当前显示车道（连续值，用于平滑滑动）
  targetLane: number // 目标车道（0-2）
  distance: number // 已跑里程（米）
  slowUntil: number // 减速效果截止（×0.6）
  smokeUntil: number // 减速带冒烟视觉截止
  boostUntil: number // 道具「加速」截止（×1.5）
  armor: boolean // 道具「碰撞装甲」是否持有
  collideUntil: number // 碰撞冷却截止
  boosting: boolean // 是否按住「加油」
}

interface AiState {
  lane: number
  targetLane: number
  distance: number
  speedBase: number // 本段基准速度
  hearts: number // 体力 ♥（仅 AI）
  spinUntil: number // 打转截止（×0.4，头顶 😵💫）
  slowUntil: number // 减速弹/导弹减速截止（×0.5）
  stunUntil: number // 装甲反震：速度归零截止
  pantUntil: number // 喘息截止（×0.2，头顶 💤）
  collideUntil: number // 碰撞冷却截止
  finished: boolean // 是否已冲线
  laneChangeAt: number // 下次考虑变道时间
  speedResampleAt: number // 下次重采样速度时间
}

interface RoadObject {
  lane: number
  distance: number
}

/** 路上道具：生成时即决定类型（拾取时所见即所得） */
interface ItemObject extends RoadObject {
  kind: ItemKind
}

interface MissileState {
  target: number // 目标 AI 下标
  start: number // 发射时间（游戏内时钟）
  duration: number // 飞行时长
}

interface GameState {
  player: PlayerState
  ais: AiState[]
  items: ItemObject[] // 路上道具（所见即所得）
  bumps: RoadObject[] // 减速带（横向路面条块）
  missile: MissileState | null
  nextItemAt: number // 下次刷道具箱里程
  nextBumpAt: number // 下次刷减速带里程
  finishedCount: number // 已冲线 AI 数
  shakeUntil: number // 屏幕震动截止
  finished: boolean // 玩家是否冲线
  now: number // 游戏内时钟
}

function randLane(): number {
  return Math.floor(Math.random() * LANES)
}

/** 随机道具类型（4 种等概率） */
function randomItemKind(): ItemKind {
  return ITEM_KINDS[Math.floor(Math.random() * ITEM_KINDS.length)]
}

/** 平滑逼近：把 cur 以 maxStep 为最大步长移向 target */
function approach(cur: number, target: number, maxStep: number): number {
  if (cur < target) return Math.min(cur + maxStep, target)
  if (cur > target) return Math.max(cur - maxStep, target)
  return cur
}

/** 最近（未冲线）AI 下标，没有则 -1 */
function nearestAI(g: GameState): number {
  let best = -1
  let bestD = Infinity
  for (let i = 0; i < g.ais.length; i++) {
    const ai = g.ais[i]
    if (ai.finished) continue
    const d = Math.abs(ai.distance - g.player.distance)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/** 拾取道具：按生成时决定的 kind 立即生效（单槽，新捡顶旧） */
function pickup(g: GameState, kind: ItemKind) {
  const now = g.now
  const p = g.player
  switch (kind) {
    case 'boost': // 加速：速度 ×1.5 持续 3s
      p.boostUntil = now + 3
      break
    case 'missile': {
      // 导弹：自动锁定最近 AI 发射
      const target = nearestAI(g)
      if (target >= 0) g.missile = { target, start: now, duration: 0.5 }
      break
    }
    case 'slow': {
      // 减速弹：最近 AI 速度 ×0.5 持续 4s
      const target = nearestAI(g)
      if (target >= 0) g.ais[target].slowUntil = now + 4
      break
    }
    case 'armor': // 碰撞装甲：下次碰撞自己不掉速、AI -1♥ 且速度归零 2s
      p.armor = true
      break
  }
}

/** 每帧推进：AI/道具/碰撞/里程 */
function update(g: GameState, dt: number) {
  const now = g.now
  const p = g.player
  const pLane = Math.round(p.lane)

  // 玩家切道滑动
  p.lane = approach(p.lane, p.targetLane, dt * SLIDE_SPEED)

  // 玩家速度：巡航/加速 × 各类倍率
  const boosting = p.boosting
  let mult = 1
  if (now < p.slowUntil) mult *= 0.6 // 碰撞/减速带减速 1-1.5s
  if (now < p.boostUntil) mult *= 1.5 // 道具加速
  p.distance += (boosting ? BOOST : CRUISE) * mult * dt

  // 刷道具：每 300-500m 随机车道刷 1 个，生成时随机决定类型（所见即所得）
  if (p.distance >= g.nextItemAt) {
    g.items.push({
      lane: randLane(),
      distance: p.distance + 120 + Math.random() * 200,
      kind: randomItemKind(),
    })
    g.nextItemAt = p.distance + 300 + Math.random() * 200
  }
  // 刷减速带
  if (p.distance >= g.nextBumpAt) {
    g.bumps.push({ lane: randLane(), distance: p.distance + 120 + Math.random() * 200 })
    g.nextBumpAt = p.distance + 250 + Math.random() * 200
  }

  // 道具拾取
  for (let i = g.items.length - 1; i >= 0; i--) {
    const it = g.items[i]
    if (it.lane === pLane && p.distance >= it.distance - 5) {
      g.items.splice(i, 1)
      playCorrect()
      pickup(g, it.kind)
    }
  }
  // 减速带：撞上减速 1.5s（×0.6）+ 冒烟震动
  for (let i = g.bumps.length - 1; i >= 0; i--) {
    const b = g.bumps[i]
    if (b.lane === pLane && Math.abs(p.distance - b.distance) < 8) {
      g.bumps.splice(i, 1)
      p.slowUntil = now + 1.5
      p.smokeUntil = now + 1.5
      g.shakeUntil = now + 0.3
      playClick()
    }
  }

  // 导弹飞行：到达目标 -2♥ + 减速 3s
  if (g.missile) {
    const m = g.missile
    if (now >= m.start + m.duration) {
      const ai = g.ais[m.target]
      if (ai && !ai.finished) {
        ai.hearts -= 2
        ai.slowUntil = now + 3
        if (ai.hearts <= 0) ai.pantUntil = now + 3
        g.shakeUntil = now + 0.3
        playCorrect()
      }
      g.missile = null
    }
  }

  // AI 更新：变道、速度重采样、滑动、前进、冲线
  for (const ai of g.ais) {
    if (ai.finished) continue
    if (now >= ai.laneChangeAt) {
      // 每 2-4s 概率随机变到另一道
      if (Math.random() < 0.7) {
        ai.targetLane = (ai.targetLane + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES
      }
      ai.laneChangeAt = now + 2 + Math.random() * 2
    }
    if (now >= ai.speedResampleAt) {
      ai.speedBase = AI_BASE + (Math.random() * 6 - 3) // 27 ± 3
      ai.speedResampleAt = now + 1 + Math.random()
    }
    ai.lane = approach(ai.lane, ai.targetLane, dt * AI_SLIDE_SPEED)
    let aiMult = 1
    if (now < ai.spinUntil) aiMult *= 0.4 // 打转
    if (now < ai.slowUntil) aiMult *= 0.5 // 减速弹/导弹
    if (ai.hearts <= 0 && now < ai.pantUntil) aiMult *= 0.2 // 喘息
    const aiSpeed = now < ai.stunUntil ? 0 : ai.speedBase * aiMult
    ai.distance += aiSpeed * dt
    if (ai.distance >= TRACK) {
      ai.distance = TRACK
      ai.finished = true
      g.finishedCount++ // 按冲线顺序记录名次
    }
  }

  // 玩家撞 AI：同车道 + 距离差 < 阈值（带冷却，避免每帧重复触发）
  for (const ai of g.ais) {
    if (ai.finished) continue
    if (now < p.collideUntil || now < ai.collideUntil) continue
    if (Math.round(ai.lane) !== pLane) continue
    if (Math.abs(ai.distance - p.distance) >= COLLIDE_DIST) continue
    ai.collideUntil = now + 1
    p.collideUntil = now + 1
    g.shakeUntil = now + 0.3
    playCorrect()
    if (p.armor) {
      // 装甲反震：自己不掉速、AI -1♥ 且速度归零 2s
      p.armor = false
      ai.hearts -= 1
      ai.stunUntil = now + 2
      ai.spinUntil = now + 2
    } else {
      // 普通碰撞：AI -1♥ + 打转减速 2s；玩家减速 1s
      ai.hearts -= 1
      ai.spinUntil = now + 2
      p.slowUntil = now + 1
    }
    if (ai.hearts <= 0) ai.pantUntil = now + 3 // 归零 → 喘息 3s
  }

  // 清掉已从身后路过的路面物件
  g.items = g.items.filter((it) => it.distance > p.distance - 30)
  g.bumps = g.bumps.filter((b) => b.distance > p.distance - 30)

  // 玩家冲线
  if (p.distance >= TRACK) {
    p.distance = TRACK
    g.finished = true
  }
}

function initGame(): GameState {
  return {
    player: {
      lane: 1,
      targetLane: 1,
      distance: 0,
      slowUntil: 0,
      smokeUntil: 0,
      boostUntil: 0,
      armor: false,
      collideUntil: 0,
      boosting: false,
    },
    // 3 个对手初始各占一道，且都在玩家前方（避免起跑即碰撞）
    ais: [0, 1, 2].map((i) => ({
      lane: i,
      targetLane: i,
      distance: 30 + i * 40,
      speedBase: AI_BASE + (Math.random() * 2 - 1),
      hearts: 3,
      spinUntil: 0,
      slowUntil: 0,
      stunUntil: 0,
      pantUntil: 0,
      collideUntil: 0,
      finished: false,
      laneChangeAt: 1.5 + Math.random() * 2,
      speedResampleAt: 1 + Math.random(),
    })),
    items: [],
    bumps: [],
    missile: null,
    nextItemAt: 300,
    nextBumpAt: 250,
    finishedCount: 0,
    shakeUntil: 0,
    finished: false,
    now: 0,
  }
}

/** 🏍️ 摩托大乱斗（ADR-0015）：净化版对抗竞速，点车道切道 + 按住加油 */
export function MotorbikeRushGame({ onExit }: { onExit: () => void }) {
  const { save, applyMiniGameResult } = useSave()
  const gameRef = useRef<GameState | null>(null)
  if (!gameRef.current) gameRef.current = initGame()
  // 首通提示坑：开局捕获首通标记，结算时用（applyMiniGameResult 会把 played 置 true）
  const firstTimeRef = useRef(!save.miniGames.race.played)

  const [runId, setRunId] = useState(0)
  const [, setTick] = useState(0)
  const [done, setDone] = useState(false)
  const [stars, setStars] = useState(0)
  const [rank, setRank] = useState(1)
  const appliedRef = useRef(false)

  // rAF 主循环：onRetry 时 runId 变化重新初始化并重启
  useEffect(() => {
    const g = initGame()
    gameRef.current = g
    appliedRef.current = false
    setDone(false)
    setStars(0)
    setRank(1)

    let raf = 0
    let last = performance.now()
    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05) // 限制最大步长，防切后台跳帧
      last = t
      g.now += dt
      update(g, dt)

      if (g.finished) {
        // 玩家名次 = 已到达 AI 数 + 1；名次 → 星级（保底 1 星）
        const r = g.finishedCount + 1
        const s = r === 1 ? 3 : r === 2 ? 2 : 1
        setRank(r)
        setStars(s)
        setDone(true)
        playFanfare()
        if (!appliedRef.current) {
          appliedRef.current = true
          applyMiniGameResult('race', s)
        }
        return // 结算后停止 rAF
      }
      setTick((v) => v + 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf) // 退出/重开/卸载均清理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, applyMiniGameResult])

  const g = gameRef.current
  const p = g.player

  // 实时名次：已冲线 + 仍在玩家前方的 AI 数
  const liveRank = done ? rank : 1 + g.ais.filter((a) => a.distance > p.distance).length
  const progress = Math.min(1, p.distance / TRACK)
  const shaking = g.now < g.shakeUntil
  const powerEmoji =
    p.boostUntil > g.now ? '💨' : g.missile ? '🚀' : p.armor ? '🛡️' : null

  const yOf = (dist: number) => BOTTOM_Y - (dist - p.distance) * PPM
  const laneLeft = (lane: number) => `${LANE_PCTS[lane] * 100}%`

  const boostDown = () => {
    g.player.boosting = true
  }
  const boostUp = () => {
    g.player.boosting = false
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-sky-500 to-indigo-600 px-4 pb-6">
      {/* 顶部 HUD */}
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
        <h1 className="text-xl font-black text-white drop-shadow">🏍️ 摩托大乱斗</h1>
        <div className="rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-slate-600 shadow">
          🏁 第 {liveRank} 名
        </div>
      </div>

      {/* 里程进度条 */}
      <div className="mx-auto mt-3 w-full max-w-md">
        <div className="h-4 overflow-hidden rounded-full bg-white/30 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-400"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs font-bold text-white/90">
          <span>🚧 {Math.min(TRACK, Math.floor(p.distance))}m / {TRACK}m</span>
          <span>道具：{powerEmoji ?? '—'}</span>
        </div>
      </div>

      <p className="mx-auto mt-2 w-full max-w-md text-center text-sm font-bold text-white/90">
        点车道变道 🏍️ · 按住「🏁 加油」冲呀！
      </p>

      {/* 赛道（点按 x 坐标分 3 区切道） */}
      <div
        className="relative mx-auto mt-2 w-full max-w-md touch-none select-none overflow-hidden rounded-3xl bg-slate-800 shadow-2xl"
        style={{
          height: ROAD_H,
          transform: shaking
            ? `translate(${(Math.random() - 0.5) * 8}px, ${(Math.random() - 0.5) * 6}px)`
            : undefined,
        }}
        onPointerDown={(e) => {
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          const frac = (e.clientX - rect.left) / rect.width
          const lane = frac < 1 / 3 ? 0 : frac < 2 / 3 ? 1 : 2
          g.player.targetLane = lane
          playClick()
        }}
      >
        {/* 路面滚动标线 */}
        <div className="absolute inset-y-0 left-0 w-2 bg-white/60" />
        <div className="absolute inset-y-0 right-0 w-2 bg-white/60" />
        {[1 / 3, 2 / 3].map((x) => (
          <div
            key={x}
            className="absolute inset-y-0 w-1.5 bg-white/40"
            style={{
              left: `${x * 100}%`,
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(255,255,255,0.7) 0 26px, transparent 26px 52px)',
              backgroundPositionY: `${(p.distance * PPM) % 52}px`,
            }}
          />
        ))}

        {/* 路上道具：所见即所得，各图标 + 彩色发光圆底 */}
        {g.items.map((it, i) => {
          const y = yOf(it.distance)
          if (y < -40 || y > ROAD_H + 30) return null
          const meta = ITEM_META[it.kind]
          return (
            <div
              key={`i${i}`}
              className="absolute"
              style={{ left: laneLeft(it.lane), top: y, transform: 'translate(-50%, -50%)' }}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg ring-2 ring-white/80 ${meta.bg}`}
              >
                <span className="text-2xl drop-shadow">{meta.emoji}</span>
              </div>
            </div>
          )
        })}

        {/* 减速带：横向黄黑斜纹条块（真实路障形态，与圆形道具区分） */}
        {g.bumps.map((b, i) => {
          const y = yOf(b.distance)
          if (y < -40 || y > ROAD_H + 30) return null
          return (
            <div
              key={`b${i}`}
              className="absolute h-3.5 w-1/4 rounded-sm shadow-md ring-1 ring-black/40"
              style={{
                left: laneLeft(b.lane),
                top: y,
                transform: 'translate(-50%, -50%)',
                backgroundImage:
                  'repeating-linear-gradient(45deg, #f59e0b 0 8px, #1f2937 8px 16px)',
              }}
            />
          )
        })}

        {/* 导弹飞行 🚀 */}
        {g.missile &&
          (() => {
            const m = g.missile
            const t = Math.min(1, (g.now - m.start) / m.duration)
            const ai = g.ais[m.target]
            const fromX = LANE_PCTS[Math.round(p.lane)] * 100
            const toX = LANE_PCTS[Math.round(ai.lane)] * 100
            const fromY = BOTTOM_Y - 40
            const toY = yOf(ai.distance)
            return (
              <div
                className="absolute text-2xl"
                style={{
                  left: `${fromX + (toX - fromX) * t}%`,
                  top: fromY + (toY - fromY) * t,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                🚀
              </div>
            )
          })()}

        {/* AI 对手 */}
        {g.ais.map((ai, i) => {
          const y = yOf(ai.distance)
          if (y < -60 || y > ROAD_H + 40) return null
          const spinning = g.now < ai.spinUntil
          const panting = ai.hearts <= 0 && g.now < ai.pantUntil
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: laneLeft(Math.round(ai.lane)), top: y, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative flex h-11 w-11 items-center justify-center">
                <div className={`absolute inset-0 rounded-full ${AI_COLORS[i]}`} />
                <span className={`relative text-3xl ${spinning ? 'animate-spin' : ''}`}>🛵</span>
              </div>
              {ai.hearts > 0 && (
                <div className="mt-0.5 text-xs font-black text-amber-300">
                  {'♥'.repeat(Math.max(0, ai.hearts))}
                </div>
              )}
              {panting ? (
                <div className="text-lg">💤</div>
              ) : spinning ? (
                <div className="text-lg">😵💫</div>
              ) : null}
            </div>
          )
        })}

        {/* 玩家摩托（固定在底部） */}
        <div
          className="absolute flex flex-col items-center"
          style={{ left: laneLeft(Math.round(p.lane)), top: BOTTOM_Y, transform: 'translate(-50%, -50%)' }}
        >
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-400/90 ring-4 ring-white/70" />
            <span className="relative text-4xl">🏍️</span>
            {p.boostUntil > g.now && (
              <span className="absolute -right-7 text-xl drop-shadow">💨</span>
            )}
            {p.smokeUntil > g.now && (
              <span className="absolute -left-7 text-xl drop-shadow">🌫️</span>
            )}
            {p.armor && <span className="absolute -right-4 -top-1 text-lg drop-shadow">🛡️</span>}
          </div>
        </div>
      </div>

      {/* 加油按钮 */}
      <div className="mx-auto mt-3 w-full max-w-md">
        <button
          className="w-full touch-none select-none rounded-3xl bg-gradient-to-b from-yellow-300 to-amber-400 py-5 text-2xl font-black text-amber-900 shadow-xl active:scale-95"
          onPointerDown={boostDown}
          onPointerUp={boostUp}
          onPointerCancel={boostUp}
          onPointerLeave={boostUp}
        >
          🏁 加油
        </button>
      </div>

      {done && (
        <GameResultOverlay
          gradient="from-sky-500 to-indigo-500"
          emoji="🏍️"
          cardHint={firstTimeRef.current ? '彩蛋卡' : null}
          stars={stars}
          rank={rank}
          onRetry={() => setRunId((v) => v + 1)}
          onExit={onExit}
        />
      )}
    </div>
  )
}
