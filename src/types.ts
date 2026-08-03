// 领域类型定义（与 docs/glossary.md 术语对齐）

export type ThemeId = 'car' | 'history' | 'minecraft'
export type Difficulty = 'beginner' | 'intermediate'
export type QuestionType = 'choice' | 'judge'

export interface Question {
  id: string
  theme: ThemeId
  subTheme: string // 子主题 key（见 docs/adr/0012）
  difficulty: Difficulty
  type: QuestionType
  prompt: string // 题目（短句、口语化、可朗读）
  options: string[] // 四选一 / 判断（["对","错"]）
  answer: number // 正确选项下标
  fact: string // 知识小故事（学习时刻朗读）
  cardName: string // 对应知识卡片名
  cardEmoji: string // 卡片图标（MVP 用 emoji 占位）
  expansion?: Expansion // 知识扩展（ADR-0013）
}

/** 知识扩展：图文学习页（ADR-0013） */
export interface Expansion {
  title: string // 大字标题
  body: string // 2-4 句正文（50-80 字，可朗读）
  image?: string // 预留：插图 URL/素材 key（MVP 用 emoji 占位）
  source: string // 来源文本（保证史实可溯）
  links?: { label: string; url: string }[] // https 白名单外链
}

export type LevelType = 'normal' | 'review' | 'treasure'

export interface LevelNode {
  index: number // 1-10
  type: LevelType
  subTheme?: string // 普通关的子主题 key
  title: string // 童趣关名
  emoji: string
}

export interface ThemeProgress {
  highestUnlocked: number // 已解锁的最高关卡 index（第 1 关默认解锁）
  starsPerLevel: Record<number, number> // 每关最佳星级（0-3）
  clearedLevels: number[] // 已通关关卡 index
  collectedCardIds: string[] // 图鉴中已收集的卡片 id（题卡）
  medal: boolean // 通关奖牌（10 关全通）
  goldMedal: boolean // 金色奖牌（10 关全 3 星）
  mistakePool: string[] // 错题池（题目 id）
}

export interface Settings {
  dailyLimitMinutes: number // 每日时长上限（分钟，0 = 不限）
  todayPlayedMinutes: number
  todayDate: string // YYYY-MM-DD
  muted: boolean
}

/** 小游戏进度（ADR-0014）：按主题记录 */
export interface MiniGameProgress {
  played: boolean // 是否首通（首通送小游戏卡）
  bestStars: number // 最佳星级 0-3
}

export interface SaveData {
  version: 1
  stars: number // 总星星
  themeProgress: Record<ThemeId, ThemeProgress>
  miniGames: Record<ThemeId, MiniGameProgress>
  settings: Settings
}

export interface LevelResult {
  levelIndex: number
  nodeType: LevelType
  passed: boolean
  correct: number
  total: number
  stars: number // 0-3
  bonusStars: number // 宝藏关全对额外奖励（货币）
  wrongQuestionIds: string[]
  correctQuestionIds: string[]
  unlockedCardIds: string[]
}
