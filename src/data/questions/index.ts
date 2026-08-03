import type { Question, ThemeId } from '../../types'
import carStarter from './starter/car.json'
import carBeginner from './beginner/car.json'
import carIntermediate from './intermediate/car.json'
import carAdvanced from './advanced/car.json'
import historyStarter from './starter/history.json'
import historyBeginner from './beginner/history.json'
import historyIntermediate from './intermediate/history.json'
import historyAdvanced from './advanced/history.json'
import mcStarter from './starter/minecraft.json'
import mcBeginner from './beginner/minecraft.json'
import mcIntermediate from './intermediate/minecraft.json'
import mcAdvanced from './advanced/minecraft.json'

// 内置题库按难度分文件夹存放（ADR-0016）：
//   src/data/questions/<难度>/<主题>.json（starter/beginner/intermediate/advanced）
export const QUESTIONS: Record<ThemeId, Question[]> = {
  car: [
    ...(carStarter as Question[]),
    ...(carBeginner as Question[]),
    ...(carIntermediate as Question[]),
    ...(carAdvanced as Question[]),
  ],
  history: [
    ...(historyStarter as Question[]),
    ...(historyBeginner as Question[]),
    ...(historyIntermediate as Question[]),
    ...(historyAdvanced as Question[]),
  ],
  minecraft: [
    ...(mcStarter as Question[]),
    ...(mcBeginner as Question[]),
    ...(mcIntermediate as Question[]),
    ...(mcAdvanced as Question[]),
  ],
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
