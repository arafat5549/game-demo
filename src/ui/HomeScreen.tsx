import { motion } from 'framer-motion'
import type { Difficulty, ThemeId } from '../types'
import { DIFFICULTIES, THEMES } from '../data/themes'
import { useSave } from '../store/save'
import { playClick } from '../audio/sfx'
import { speak } from '../audio/tts'

interface Props {
  onEnterTheme: (t: ThemeId) => void
  onOpenParent: () => void
  onOpenMiniHall: () => void
  onOpenBonusCollection: () => void
  overLimit: boolean
}

export function HomeScreen({ onEnterTheme, onOpenParent, onOpenMiniHall, onOpenBonusCollection, overLimit }: Props) {
  const { save, updateSettings } = useSave()
  // 有主题通关但对应小游戏还没玩过 → 红点提醒
  const miniGamePending = (['car', 'history', 'minecraft'] as ThemeId[]).some(
    (t) => save.themeProgress[t].medal && !save.miniGames[t].played,
  )
  // 彩蛋图鉴入口：三主题全通关亮起；全通但彩蛋小游戏未首通 → 红点（ADR-0015）
  const bonusUnlocked = (['car', 'history', 'minecraft'] as ThemeId[]).every(
    (t) => save.themeProgress[t].medal,
  )
  const bonusPending = bonusUnlocked && !save.miniGames.race.played

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-indigo-300 to-violet-300 p-4">
      {/* 顶部栏 */}
      <div className="mx-auto flex max-w-md items-center justify-between">
        <h1 className="text-2xl font-black text-white drop-shadow-md">🎴 知识卡牌大冒险</h1>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-white/90 px-3 py-1 text-lg font-bold text-amber-500 shadow">
            ⭐ {save.stars}
          </div>
          <button
            aria-label={save.settings.muted ? '打开声音' : '静音'}
            className="rounded-full bg-white/90 px-2.5 py-1 text-lg shadow"
            onClick={() => {
              playClick()
              updateSettings({ muted: !save.settings.muted })
            }}
          >
            {save.settings.muted ? '🔇' : '🔊'}
          </button>
          <button
            aria-label="家长专区"
            className="rounded-full bg-white/90 px-2.5 py-1 text-lg shadow"
            onClick={() => {
              playClick()
              onOpenParent()
            }}
          >
            🔒
          </button>
        </div>
      </div>

      <p className="mx-auto mt-2 max-w-md text-center text-sm text-white/90">
        答题闯关赢星星，收集三大世界的知识卡片！
      </p>

      {/* 难度选择（ADR-0015）：4 档年级制，全局生效 */}
      <div className="mx-auto mt-3 max-w-md">
        <div className="mb-1.5 text-center text-xs font-bold text-white/80">选择难度</div>
        <div className="grid grid-cols-4 gap-2">
          {DIFFICULTIES.map((d) => {
            const active = save.settings.difficulty === d.id
            return (
              <button
                key={d.id}
                onClick={() => {
                  playClick()
                  updateSettings({ difficulty: d.id as Difficulty })
                  speak(`${d.emoji}${d.label}，${d.age}`)
                }}
                className={`flex flex-col items-center rounded-2xl border-b-4 px-1 py-2 shadow transition active:scale-95 ${
                  active
                    ? 'border-white bg-white text-indigo-600'
                    : 'border-white/40 bg-white/30 text-white'
                }`}
              >
                <span className="text-2xl">{d.emoji}</span>
                <span className="text-sm font-black">{d.label}</span>
                <span className={`text-[10px] ${active ? 'text-indigo-400' : 'text-white/70'}`}>
                  {d.age}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 时长锁定遮罩 */}
      {overLimit && (
        <div className="mx-auto mt-4 max-w-md rounded-2xl bg-white/95 p-4 text-center shadow-lg">
          <div className="text-4xl">🌙</div>
          <p className="mt-1 text-lg font-bold text-slate-700">今天玩够啦，明天再来！</p>
          <p className="text-sm text-slate-500">休息一下，眼睛也要做运动哦。</p>
        </div>
      )}

      {/* 主题世界入口 */}
      <div className="mx-auto mt-6 flex max-w-md flex-col gap-4">
        {(Object.keys(THEMES) as ThemeId[]).map((id, i) => {
          const meta = THEMES[id]
          const prog = save.themeProgress[id]
          const cleared = prog.clearedLevels.length
          return (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              disabled={overLimit}
              onClick={() => {
                playClick()
                speak(meta.name)
                onEnterTheme(id)
              }}
              className={`relative flex items-center gap-4 rounded-3xl bg-gradient-to-r ${meta.gradient} p-5 text-left text-white shadow-xl transition active:scale-95 disabled:opacity-60`}
            >
              <div className="text-5xl drop-shadow">{meta.emoji}</div>
              <div className="flex-1">
                <div className="text-2xl font-black drop-shadow">{meta.name}</div>
                <div className="text-sm text-white/90">{meta.tagline}</div>
              </div>
              <div className="text-right">
                <div className="rounded-full bg-white/25 px-3 py-1 text-sm font-bold">
                  {cleared}/10 关
                </div>
                <div className="mt-1 text-xs text-white/80">
                  {prog.highestUnlocked >= 10 ? '🎓 已通关' : `第 ${prog.highestUnlocked} 关`}
                </div>
              </div>
            </motion.button>
          )
        })}

        {/* 小游戏厅入口（ADR-0014） */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          disabled={overLimit}
          onClick={() => {
            playClick()
            onOpenMiniHall()
          }}
          className="relative flex items-center gap-4 rounded-3xl bg-gradient-to-r from-violet-500 to-fuchsia-500 p-5 text-left text-white shadow-xl transition active:scale-95 disabled:opacity-60"
        >
          {miniGamePending && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-black shadow">
              !
            </span>
          )}
          <div className="text-5xl drop-shadow">🎮</div>
          <div className="flex-1">
            <div className="text-2xl font-black drop-shadow">小游戏厅</div>
            <div className="text-sm text-white/90">汽车组装 · 文物拼图 · 挖矿大作战</div>
          </div>
          <div className="text-3xl">▶️</div>
        </motion.button>

        {/* 彩蛋图鉴入口（ADR-0015）：三主题全通关解锁 */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          disabled={overLimit || !bonusUnlocked}
          onClick={() => {
            playClick()
            onOpenBonusCollection()
          }}
          className="relative flex items-center gap-4 rounded-3xl bg-gradient-to-r from-sky-500 to-indigo-500 p-5 text-left text-white shadow-xl transition active:scale-95 disabled:opacity-60"
        >
          {bonusPending && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-black shadow">
              !
            </span>
          )}
          <div className="text-5xl drop-shadow">🎉</div>
          <div className="flex-1">
            <div className="text-2xl font-black drop-shadow">彩蛋图鉴</div>
            <div className="text-sm text-white/90">
              {bonusUnlocked ? '摩托大乱斗 · 隐藏彩蛋等你收集' : '🔒 通关全部主题解锁'}
            </div>
          </div>
          <div className="text-3xl">{bonusUnlocked ? '▶️' : '🔒'}</div>
        </motion.button>
      </div>
    </div>
  )
}
