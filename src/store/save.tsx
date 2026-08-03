import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { LevelResult, SaveData, Settings, ThemeId } from '../types'

const SAVE_KEY = 'quiz-quest-save-v1'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function defaultProgress() {
  return {
    highestUnlocked: 1,
    starsPerLevel: {},
    clearedLevels: [],
    collectedCardIds: [],
    medal: false,
    goldMedal: false,
    mistakePool: [],
  }
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    stars: 0,
    themeProgress: {
      car: defaultProgress(),
      history: defaultProgress(),
      minecraft: defaultProgress(),
    },
    settings: {
      dailyLimitMinutes: 0,
      todayPlayedMinutes: 0,
      todayDate: today(),
      muted: false,
    },
  }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return defaultSave()
    const parsed = JSON.parse(raw) as Partial<SaveData>
    const base = defaultSave()
    return {
      ...base,
      ...parsed,
      themeProgress: {
        car: { ...base.themeProgress.car, ...parsed.themeProgress?.car },
        history: { ...base.themeProgress.history, ...parsed.themeProgress?.history },
        minecraft: { ...base.themeProgress.minecraft, ...parsed.themeProgress?.minecraft },
      },
      settings: { ...base.settings, ...parsed.settings },
    }
  } catch {
    return defaultSave()
  }
}

function persist(save: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // 隐私模式等场景下静默失败
  }
}

interface SaveApi {
  save: SaveData
  applyLevelResult: (theme: ThemeId, result: LevelResult) => void
  addPlayTime: (minutes: number) => void
  updateSettings: (patch: Partial<Settings>) => void
  clearSave: () => void
}

const SaveContext = createContext<SaveApi | null>(null)

export function SaveProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<SaveData>(() => loadSave())

  // 跨天自动重置每日计时
  useEffect(() => {
    if (save.settings.todayDate !== today()) {
      setSave((s) => ({
        ...s,
        settings: { ...s.settings, todayDate: today(), todayPlayedMinutes: 0 },
      }))
    }
  }, [save.settings.todayDate])

  useEffect(() => {
    persist(save)
  }, [save])

  const applyLevelResult = useCallback((theme: ThemeId, result: LevelResult) => {
    setSave((s) => {
      const prog = s.themeProgress[theme]
      const cleared = result.passed
        ? Array.from(new Set([...prog.clearedLevels, result.levelIndex]))
        : prog.clearedLevels
      const starsPerLevel = { ...prog.starsPerLevel }
      if (result.passed && result.levelIndex !== undefined) {
        starsPerLevel[result.levelIndex] = Math.max(
          starsPerLevel[result.levelIndex] ?? 0,
          result.stars,
        )
      }
      // 解锁下一关（1 星即解锁，永不卡关）
      let highest = prog.highestUnlocked
      if (result.passed && result.levelIndex !== undefined) {
        highest = Math.max(highest, Math.min(result.levelIndex + 1, 10))
      }
      // 错题池：错题加入（去重）；复习关答对的题移出
      const poolAfterAdd = Array.from(new Set([...prog.mistakePool, ...result.wrongQuestionIds]))
      const mistakePool =
        result.nodeType === 'review'
          ? poolAfterAdd.filter((id) => !result.correctQuestionIds.includes(id))
          : poolAfterAdd
      // 图鉴：过关后本关全部卡片入册
      const collectedCardIds = Array.from(
        new Set([...prog.collectedCardIds, ...result.unlockedCardIds]),
      )
      const clearedAll = cleared.length >= 10
      const allThreeStars = Object.keys(starsPerLevel).length >= 10 &&
        Object.values(starsPerLevel).every((n) => n >= 3)
      return {
        ...s,
        stars: s.stars + result.stars + result.bonusStars,
        themeProgress: {
          ...s.themeProgress,
          [theme]: {
            ...prog,
            highestUnlocked: highest,
            starsPerLevel,
            clearedLevels: cleared,
            mistakePool,
            collectedCardIds,
            medal: prog.medal || clearedAll,
            goldMedal: prog.goldMedal || allThreeStars,
          },
        },
      }
    })
  }, [])

  const addPlayTime = useCallback((minutes: number) => {
    setSave((s) => ({
      ...s,
      settings: {
        ...s.settings,
        todayDate: today(),
        todayPlayedMinutes: s.settings.todayPlayedMinutes + minutes,
      },
    }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSave((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  }, [])

  const clearSave = useCallback(() => {
    const fresh = defaultSave()
    setSave(fresh)
    persist(fresh)
  }, [])

  return (
    <SaveContext.Provider
      value={{ save, applyLevelResult, addPlayTime, updateSettings, clearSave }}
    >
      {children}
    </SaveContext.Provider>
  )
}

export function useSave(): SaveApi {
  const ctx = useContext(SaveContext)
  if (!ctx) throw new Error('useSave 必须在 SaveProvider 内使用')
  return ctx
}
