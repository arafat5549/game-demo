import type { Question, ThemeId } from '../types'
import { QUESTIONS } from '../data/questions'

// 家长自定义题库：独立 localStorage 存储（不混入进度存档）
const CUSTOM_KEY = 'quiz-quest-custom-bank-v1'
const MAX_PER_THEME = 200

const THEMES: ThemeId[] = ['car', 'history', 'minecraft']

export function loadCustomBank(): Question[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    return raw ? (JSON.parse(raw) as Question[]) : []
  } catch {
    return []
  }
}

function persist(bank: Question[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(bank))
  } catch {
    // 隐私模式等场景下静默失败
  }
}

export type ValidationResult =
  | { ok: true; questions: Question[] }
  | { ok: false; error: string }

/** 校验家长导入的题目（docs/custom-question-format.md 的校验规则） */
export function validateCustomQuestions(data: unknown): ValidationResult {
  if (!Array.isArray(data)) {
    return { ok: false, error: '格式错误：内容必须是一个 JSON 数组，例如 [ { ...题目... } ]' }
  }
  if (data.length === 0) {
    return { ok: false, error: '没有题目：数组是空的' }
  }

  const bank = loadCustomBank()
  const existingIds = new Set([
    ...Object.values(QUESTIONS).flatMap((qs) => qs.map((q) => q.id)),
    ...bank.map((q) => q.id),
  ])

  const questions: Question[] = []
  for (let i = 0; i < data.length; i++) {
    const label = `第 ${i + 1} 题`
    const q = data[i] as Record<string, unknown> | null
    if (!q || typeof q !== 'object') {
      return { ok: false, error: `${label}：不是对象` }
    }

    // 必填字段
    const required = ['id', 'theme', 'subTheme', 'difficulty', 'type', 'prompt', 'options', 'answer', 'fact', 'cardName', 'cardEmoji'] as const
    for (const field of required) {
      const v = q[field]
      if (v === undefined || v === null || v === '') {
        return { ok: false, error: `${label}：缺少必填字段 "${field}"` }
      }
    }

    // 枚举校验
    if (!THEMES.includes(q.theme as ThemeId)) {
      return { ok: false, error: `${label}：theme 必须是 car / history / minecraft` }
    }
    if (q.difficulty !== 'beginner' && q.difficulty !== 'intermediate') {
      return { ok: false, error: `${label}：difficulty 必须是 beginner / intermediate` }
    }
    if (q.type !== 'choice' && q.type !== 'judge') {
      return { ok: false, error: `${label}：type 必须是 choice / judge` }
    }

    // 选项与答案
    if (!Array.isArray(q.options)) {
      return { ok: false, error: `${label}：options 必须是数组` }
    }
    const opts = q.options
    if (q.type === 'choice' && opts.length !== 4) {
      return { ok: false, error: `${label}：选择题必须有 4 个选项` }
    }
    if (q.type === 'judge' && (opts.length !== 2 || opts[0] !== '对' || opts[1] !== '错')) {
      return { ok: false, error: `${label}：判断题选项必须是 ["对","错"]` }
    }
    const ans = q.answer
    if (typeof ans !== 'number' || !Number.isInteger(ans) || ans < 0 || ans >= opts.length) {
      return { ok: false, error: `${label}：answer 必须是 0~${opts.length - 1} 的整数` }
    }

    // id 冲突
    const id = q.id as string
    if (existingIds.has(id)) {
      return { ok: false, error: `${label}：id "${id}" 已存在（内置题库或其他自定义题）` }
    }
    existingIds.add(id)

    // 扩展校验
    const exp = q.expansion as Record<string, unknown> | undefined
    if (exp !== undefined) {
      if (!exp || typeof exp !== 'object') {
        return { ok: false, error: `${label}：expansion 必须是对象` }
      }
      for (const f of ['title', 'body', 'source'] as const) {
        if (typeof exp[f] !== 'string' || !(exp[f] as string).trim()) {
          return { ok: false, error: `${label}：expansion 缺少必填字段 "${f}"` }
        }
      }
      if (exp.links !== undefined) {
        if (!Array.isArray(exp.links)) {
          return { ok: false, error: `${label}：expansion.links 必须是数组` }
        }
        for (const l of exp.links as Record<string, unknown>[]) {
          const url = l?.url
          if (typeof url !== 'string' || !url.startsWith('https://')) {
            return { ok: false, error: `${label}：外链必须是 https:// 开头` }
          }
        }
      }
    }

    questions.push(q as unknown as Question)
  }

  // 每主题上限
  for (const theme of THEMES) {
    const count =
      questions.filter((x) => x.theme === theme).length +
      bank.filter((x) => x.theme === theme).length
    if (count > MAX_PER_THEME) {
      return { ok: false, error: `主题 ${theme} 的自定义题超过上限（${MAX_PER_THEME} 题）` }
    }
  }

  return { ok: true, questions }
}

export interface ImportResult {
  ok: boolean
  count?: number
  error?: string
}

/** 校验通过后追加进自定义题库；任一题不合规则整批拒绝（ADR-0008） */
export function importCustomQuestions(data: unknown): ImportResult {
  const v = validateCustomQuestions(data)
  if (!v.ok) return v
  const bank = [...loadCustomBank(), ...v.questions]
  persist(bank)
  return { ok: true, count: v.questions.length }
}

export function removeCustomQuestion(id: string) {
  persist(loadCustomBank().filter((q) => q.id !== id))
}

export function clearCustomBank() {
  persist([])
}
