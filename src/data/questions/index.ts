import type { Question, ThemeId } from '../../types'
import carJson from './car.json'
import historyJson from './history.json'
import minecraftJson from './minecraft.json'

// 内置题库以 JSON 格式存放（ADR-0008：题库与代码分离，便于维护与家长自定义）
export const QUESTIONS: Record<ThemeId, Question[]> = {
  car: carJson as Question[],
  history: historyJson as Question[],
  minecraft: minecraftJson as Question[],
}

export function questionsBySubTheme(theme: ThemeId, subTheme: string): Question[] {
  return QUESTIONS[theme].filter((q) => q.subTheme === subTheme)
}

export function questionById(id: string): Question | undefined {
  for (const list of Object.values(QUESTIONS)) {
    const found = list.find((q) => q.id === id)
    if (found) return found
  }
  return undefined
}

/** 随机打乱数组（Fisher-Yates） */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
