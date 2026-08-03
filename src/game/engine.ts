import type { Difficulty, LevelNode, Question, ThemeId } from '../types'
import { QUESTIONS, questionById, questionsBySubTheme, shuffle } from '../data/questions'

/** 难度顺序（ADR-0015）：索引距离 = 难度距离 */
const DIFF_ORDER: Difficulty[] = ['starter', 'beginner', 'intermediate', 'advanced']

/** 按难度距离最近优先取题（同难度随机；无题自动回退相邻难度） */
export function pickByDifficulty(qs: Question[], difficulty: Difficulty, count = 5): Question[] {
  const idx = DIFF_ORDER.indexOf(difficulty)
  return shuffle(qs)
    .sort((a, b) => {
      const da = Math.abs(DIFF_ORDER.indexOf(a.difficulty) - idx)
      const db = Math.abs(DIFF_ORDER.indexOf(b.difficulty) - idx)
      return da - db
    })
    .slice(0, count)
}

/**
 * 按关卡类型生成 5 道题（见 ADR-0006 / ADR-0012 / ADR-0015）。
 * customQuestions：家长自定义题（ADR-0008），只进入宝藏关随机池与复习关补位池，不进普通关。
 */
export function buildLevelQuestions(
  theme: ThemeId,
  node: LevelNode,
  mistakePool: string[],
  customQuestions: Question[] = [],
  difficulty: Difficulty = 'beginner',
): Question[] {
  const themePool = [...QUESTIONS[theme], ...customQuestions.filter((q) => q.theme === theme)]

  if (node.type === 'normal' && node.subTheme) {
    // 普通关：本关子主题内按所选难度取题（仅内置题库）
    if (node.subTheme === 'master') {
      // 知识大满贯（关 10）：全主题混抽，检验总复习
      return pickByDifficulty(QUESTIONS[theme], difficulty)
    }
    return pickByDifficulty(questionsBySubTheme(theme, node.subTheme), difficulty)
  }
  if (node.type === 'review') {
    // 复习关：错题池抽 5 题；不足则用随机题补齐（内置 + 自定义，按难度优先）
    const poolQs = mistakePool
      .map(questionById)
      .filter((q): q is Question => Boolean(q))
    const fromPool = shuffle(poolQs).slice(0, 5)
    if (fromPool.length >= 5) return fromPool
    const used = new Set(fromPool.map((q) => q.id))
    const extra = pickByDifficulty(
      themePool.filter((q) => !used.has(q.id)),
      difficulty,
      5 - fromPool.length,
    )
    return [...fromPool, ...extra]
  }
  // 宝藏关：随机 5 题（错题池为空时替代复习关），内置 + 自定义混池，按难度优先
  return pickByDifficulty(themePool, difficulty)
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
