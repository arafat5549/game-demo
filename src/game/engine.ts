import type { LevelNode, Question, ThemeId } from '../types'
import { QUESTIONS, questionById, questionsBySubTheme, shuffle } from '../data/questions'

/**
 * 按关卡类型生成 5 道题（见 ADR-0006 / ADR-0012）。
 * customQuestions：家长自定义题（ADR-0008），只进入宝藏关随机池与复习关补位池，不进普通关。
 */
export function buildLevelQuestions(
  theme: ThemeId,
  node: LevelNode,
  mistakePool: string[],
  customQuestions: Question[] = [],
): Question[] {
  const themePool = [...QUESTIONS[theme], ...customQuestions.filter((q) => q.theme === theme)]

  if (node.type === 'normal' && node.subTheme) {
    // 普通关：全部来自本关子主题（仅内置题库）
    if (node.subTheme === 'master') {
      // 知识大满贯（关 10）：全主题混抽，检验总复习
      return shuffle(QUESTIONS[theme]).slice(0, 5)
    }
    return shuffle(questionsBySubTheme(theme, node.subTheme)).slice(0, 5)
  }
  if (node.type === 'review') {
    // 复习关：错题池抽 5 题；不足则用随机题补齐（内置 + 自定义）
    const poolQs = mistakePool
      .map(questionById)
      .filter((q): q is Question => Boolean(q))
    const fromPool = shuffle(poolQs).slice(0, 5)
    if (fromPool.length >= 5) return fromPool
    const used = new Set(fromPool.map((q) => q.id))
    const extra = shuffle(themePool)
      .filter((q) => !used.has(q.id))
      .slice(0, 5 - fromPool.length)
    return [...fromPool, ...extra]
  }
  // 宝藏关：随机 5 题（错题池为空时替代复习关），内置 + 自定义混池
  return shuffle(themePool).slice(0, 5)
}

export interface ComputedResult {
  passed: boolean
  stars: number
  bonusStars: number
}

/** 结算：答对 3 题过关；全对 3 星、对 4 题 2 星、对 3 题 1 星；宝藏关全对额外 +1 星 */
export function computeResult(correct: number, isTreasure: boolean): ComputedResult {
  const passed = correct >= 3
  const stars = passed ? (correct === 5 ? 3 : correct === 4 ? 2 : 1) : 0
  const bonusStars = isTreasure && passed && correct === 5 ? 1 : 0
  return { passed, stars, bonusStars }
}
