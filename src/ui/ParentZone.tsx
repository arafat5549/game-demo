import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useSave } from '../store/save'
import {
  clearCustomBank,
  importCustomQuestions,
  loadCustomBank,
  removeCustomQuestion,
} from '../game/customBank'
import type { Question } from '../types'
import { playClick, playCorrect, playWrong } from '../audio/sfx'

interface Props {
  onBack: () => void
}

const LIMIT_OPTIONS = [
  { minutes: 0, label: '不限时' },
  { minutes: 15, label: '15 分钟' },
  { minutes: 30, label: '30 分钟' },
  { minutes: 45, label: '45 分钟' },
  { minutes: 60, label: '60 分钟' },
]

/** 家长专区（ADR-0009）：星星谜题解锁 → 时长/静音/清档 */
export function ParentZone({ onBack }: Props) {
  const { save, updateSettings, clearSave } = useSave()
  // 解锁谜题：随机 5 个星星的点击顺序（1-5 的随机排列）
  const sequence = useMemo(() => {
    const arr = [1, 2, 3, 4, 5]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [])
  const [step, setStep] = useState(0)
  const [unlocked, setUnlocked] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [bank, setBank] = useState<Question[]>(() => loadCustomBank())
  const [pasteText, setPasteText] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [importError, setImportError] = useState('')

  const refreshBank = () => setBank(loadCustomBank())

  const applyImport = (data: unknown) => {
    const res = importCustomQuestions(data)
    if (res.ok) {
      setImportMsg(`✅ 成功导入 ${res.count} 题！它们会出现在宝藏关和复习关里`)
      setImportError('')
      setPasteText('')
      refreshBank()
    } else {
      setImportError(`❌ ${res.error ?? '导入失败'}`)
      setImportMsg('')
    }
  }

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        applyImport(JSON.parse(String(reader.result)))
      } catch {
        setImportError('❌ JSON 解析失败：请检查文件内容')
        setImportMsg('')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleStar = (n: number) => {
    if (n === sequence[step]) {
      playCorrect()
      const next = step + 1
      setStep(next)
      if (next >= 5) {
        setTimeout(() => {
          setUnlocked(true)
          playCorrect()
        }, 300)
      }
    } else {
      playWrong()
      setStep(0)
    }
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-slate-700 to-slate-900 px-4">
        <div className="mx-auto w-full max-w-md pt-8 text-center">
          <h1 className="text-2xl font-black text-white">🔒 家长专区</h1>
          <p className="mt-2 text-slate-300">
            这是大人的地方。请按照下面的顺序点击星星：
          </p>
          <div className="mt-3 rounded-2xl bg-white/10 px-4 py-2 text-xl font-black text-yellow-300">
            {sequence.join(' → ')}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => handleStar(n)}
                className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-yellow-200 to-amber-400 text-2xl shadow-lg transition active:scale-90 ${
                  step >= 5 ? 'opacity-60' : ''
                }`}
              >
                ⭐
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-400">进度：{step}/5</p>
          <button
            onClick={() => {
              playClick()
              onBack()
            }}
            className="mt-8 rounded-full bg-white/20 px-6 py-2 font-bold text-white"
          >
            ← 返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-100 to-slate-200 px-4 pb-10">
      <div className="mx-auto w-full max-w-md pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-700">⚙️ 家长专区</h1>
          <button
            onClick={() => {
              playClick()
              onBack()
            }}
            className="rounded-full bg-white px-4 py-1.5 font-bold text-slate-600 shadow"
          >
            完成 →
          </button>
        </div>

        {/* 时长限制 */}
        <div className="mt-6 rounded-3xl bg-white p-5 shadow">
          <div className="text-lg font-black text-slate-700">⏰ 每日游玩时长</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {LIMIT_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                onClick={() => {
                  playClick()
                  updateSettings({ dailyLimitMinutes: opt.minutes })
                }}
                className={`rounded-full px-3 py-2 text-sm font-bold shadow transition ${
                  save.settings.dailyLimitMinutes === opt.minutes
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            今天已玩：<b>{save.settings.todayPlayedMinutes}</b> 分钟
            {save.settings.dailyLimitMinutes > 0 && (
              <> / 上限 {save.settings.dailyLimitMinutes} 分钟</>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            到点后会自动锁定，第二天重置。游戏每 15 分钟会提醒休息。
          </p>
        </div>

        {/* 自定义题目（ADR-0008，格式见 docs/custom-question-format.md） */}
        <div className="mt-4 rounded-3xl bg-white p-5 shadow">
          <div className="text-lg font-black text-slate-700">📝 自定义题目</div>
          <p className="mt-1 text-sm text-slate-500">
            已导入 <b>{bank.length}</b> 题（出现在宝藏关和复习关里）。
            格式说明见项目 docs/custom-question-format.md。
          </p>

          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFile}
            className="mt-3 block w-full text-sm text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-indigo-100 file:px-4 file:py-2 file:font-bold file:text-indigo-600"
          />

          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="或者把 JSON 文本粘贴到这里…"
            rows={4}
            className="mt-3 w-full rounded-2xl border-2 border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
          />
          <button
            onClick={() => {
              playClick()
              try {
                applyImport(JSON.parse(pasteText))
              } catch {
                setImportError('❌ JSON 解析失败：请检查文本内容')
                setImportMsg('')
              }
            }}
            disabled={!pasteText.trim()}
            className="mt-2 w-full rounded-full bg-indigo-500 px-4 py-2.5 font-black text-white shadow transition active:scale-95 disabled:opacity-40"
          >
            导入粘贴的题目
          </button>

          {importError && <p className="mt-2 text-sm font-bold text-red-500">{importError}</p>}
          {importMsg && <p className="mt-2 text-sm font-bold text-green-600">{importMsg}</p>}

          {bank.length > 0 && (
            <div className="mt-3 rounded-2xl bg-slate-50 p-3">
              <div className="text-sm font-black text-slate-600">已导入题目：</div>
              <div className="mt-2 max-h-40 overflow-y-auto">
                {bank.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-200 py-1.5 text-sm"
                  >
                    <span className="truncate text-slate-600">
                      {q.cardEmoji} {q.prompt}
                    </span>
                    <button
                      onClick={() => {
                        playClick()
                        removeCustomQuestion(q.id)
                        refreshBank()
                      }}
                      className="shrink-0 rounded-full bg-red-100 px-3 py-1 font-bold text-red-600"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  playClick()
                  clearCustomBank()
                  refreshBank()
                  setImportMsg('已清空全部自定义题目')
                }}
                className="mt-2 rounded-full bg-slate-200 px-4 py-1.5 text-sm font-bold text-slate-600"
              >
                清空全部
              </button>
            </div>
          )}
        </div>

        {/* 声音 */}
        <div className="mt-4 rounded-3xl bg-white p-5 shadow">
          <div className="flex items-center justify-between">
            <div className="text-lg font-black text-slate-700">🔊 声音</div>
            <button
              onClick={() => {
                playClick()
                updateSettings({ muted: !save.settings.muted })
              }}
              className={`rounded-full px-4 py-2 font-bold shadow ${
                save.settings.muted ? 'bg-slate-200 text-slate-500' : 'bg-green-500 text-white'
              }`}
            >
              {save.settings.muted ? '已静音 🔇' : '声音开启 🔊'}
            </button>
          </div>
        </div>

        {/* 清除存档 */}
        <div className="mt-4 rounded-3xl bg-white p-5 shadow">
          <div className="text-lg font-black text-slate-700">🧹 清除存档</div>
          <p className="mt-1 text-sm text-slate-500">
            清空所有星星、进度、图鉴和错题池（此操作不可恢复）。
          </p>
          {confirmClear ? (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  clearSave()
                  setConfirmClear(false)
                  playClick()
                }}
                className="flex-1 rounded-full bg-red-500 px-4 py-2 font-black text-white shadow"
              >
                确定清除
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="flex-1 rounded-full bg-slate-200 px-4 py-2 font-bold text-slate-600"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                playClick()
                setConfirmClear(true)
              }}
              className="mt-3 rounded-full bg-red-100 px-4 py-2 font-bold text-red-600"
            >
              清除存档…
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          🔒 谜题锁 + 本地存档：孩子的进度只存在这台设备上。
        </p>
      </div>
    </div>
  )
}
