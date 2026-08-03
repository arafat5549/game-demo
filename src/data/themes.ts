import type { Difficulty, LevelNode, MiniGameId, ThemeId } from '../types'

// 主题元数据与关卡树（见 docs/adr/0012）
// 每主题对称 10 关：8 普通 + 2 复习（固定第 4、8 位）；关 1-4 初级、5-8 中级。
// MVP 题库覆盖关 1-3 的子主题，关 4-10 渲染为暗锁节点。

export type { MiniGameId } from '../types'

export interface SubThemeMeta {
  key: string
  title: string
  emoji: string
}

export interface ThemeMeta {
  id: ThemeId
  name: string
  emoji: string
  tagline: string
  // Tailwind 渐变类（主题皮肤）
  gradient: string
  nodeBg: string
  mapBg: string
  subThemes: SubThemeMeta[]
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  car: {
    id: 'car',
    name: '汽车博物馆',
    emoji: '🚗',
    tagline: '德国汽车历史大冒险',
    gradient: 'from-amber-400 to-orange-500',
    nodeBg: 'bg-orange-500',
    mapBg: 'bg-gradient-to-b from-sky-200 via-amber-100 to-amber-200',
    subThemes: [
      { key: 'inventor', title: '发明汽车的爷爷', emoji: '🛠️' },
      { key: 'beetle', title: '会跑的盒子', emoji: '🐞' },
      { key: 'badges', title: '三巨头车标', emoji: '👑' },
    ],
  },
  history: {
    id: 'history',
    name: '历史之旅',
    emoji: '🏯',
    tagline: '中国历史人物故事',
    gradient: 'from-emerald-500 to-teal-600',
    nodeBg: 'bg-teal-600',
    mapBg: 'bg-gradient-to-b from-amber-100 via-stone-200 to-amber-200',
    subThemes: [
      { key: 'ancient', title: '远古的中国人', emoji: '🔥' },
      { key: 'qinshihuang', title: '秦始皇与长城', emoji: '🧱' },
      { key: 'zhugeliang', title: '三国诸葛亮', emoji: '🪶' },
    ],
  },
  minecraft: {
    id: 'minecraft',
    name: 'MC 方块世界',
    emoji: '🧱',
    tagline: '方块世界知识百科',
    gradient: 'from-lime-500 to-green-600',
    nodeBg: 'bg-green-600',
    mapBg: 'bg-gradient-to-b from-lime-100 via-green-100 to-emerald-200',
    subThemes: [
      { key: 'blocks', title: '认识方块', emoji: '🧊' },
      { key: 'mining', title: '挖矿与钻石', emoji: '⛏️' },
      { key: 'mobs', title: '苦力怕与怪物', emoji: '💥' },
    ],
  },
}

// 完整关卡树骨架（关 5-10 的子主题为后续迭代内容，MVP 中暗锁）
const LEVEL_TREE: Record<ThemeId, LevelNode[]> = {
  car: [
    { index: 1, type: 'normal', subTheme: 'inventor', title: '发明汽车的爷爷', emoji: '🛠️' },
    { index: 2, type: 'normal', subTheme: 'beetle', title: '会跑的盒子', emoji: '🐞' },
    { index: 3, type: 'normal', subTheme: 'badges', title: '三巨头车标', emoji: '👑' },
    { index: 4, type: 'review', title: '复习关', emoji: '🔁' },
    { index: 5, type: 'normal', subTheme: 'bmw-audi', title: '宝马与奥迪', emoji: '🚙' },
    { index: 6, type: 'normal', subTheme: 'rescue', title: '救援车认脸', emoji: '🚒' },
    { index: 7, type: 'normal', subTheme: 'records', title: '世界汽车之最', emoji: '🏆' },
    { index: 8, type: 'review', title: '复习关', emoji: '🔁' },
    { index: 9, type: 'normal', subTheme: 'future', title: '未来汽车', emoji: '🛸' },
    { index: 10, type: 'normal', subTheme: 'master', title: '知识大满贯', emoji: '🎓' },
  ],
  history: [
    { index: 1, type: 'normal', subTheme: 'ancient', title: '远古的中国人', emoji: '🔥' },
    { index: 2, type: 'normal', subTheme: 'qinshihuang', title: '秦始皇与长城', emoji: '🧱' },
    { index: 3, type: 'normal', subTheme: 'zhugeliang', title: '三国诸葛亮', emoji: '🪶' },
    { index: 4, type: 'review', title: '复习关', emoji: '🔁' },
    { index: 5, type: 'normal', subTheme: 'inventions', title: '四大发明', emoji: '📜' },
    { index: 6, type: 'normal', subTheme: 'zhenghe', title: '郑和下西洋', emoji: '⛵' },
    { index: 7, type: 'normal', subTheme: 'relics', title: '古代宝贝', emoji: '🏺' },
    { index: 8, type: 'review', title: '复习关', emoji: '🔁' },
    { index: 9, type: 'normal', subTheme: 'festivals', title: '节日小故事', emoji: '🏮' },
    { index: 10, type: 'normal', subTheme: 'master', title: '知识大满贯', emoji: '🎓' },
  ],
  minecraft: [
    { index: 1, type: 'normal', subTheme: 'blocks', title: '认识方块', emoji: '🧊' },
    { index: 2, type: 'normal', subTheme: 'mining', title: '挖矿与钻石', emoji: '⛏️' },
    { index: 3, type: 'normal', subTheme: 'mobs', title: '苦力怕与怪物', emoji: '💥' },
    { index: 4, type: 'review', title: '复习关', emoji: '🔁' },
    { index: 5, type: 'normal', subTheme: 'building', title: '建造小房子', emoji: '🏠' },
    { index: 6, type: 'normal', subTheme: 'crafting', title: '合成工作台', emoji: '🔨' },
    { index: 7, type: 'normal', subTheme: 'redstone', title: '红石初探', emoji: '🔴' },
    { index: 8, type: 'review', title: '复习关', emoji: '🔁' },
    { index: 9, type: 'normal', subTheme: 'ender', title: '末地与终界', emoji: '🌌' },
    { index: 10, type: 'normal', subTheme: 'master', title: '知识大满贯', emoji: '🎓' },
  ],
}

export function levelTree(theme: ThemeId): LevelNode[] {
  return LEVEL_TREE[theme]
}

export function levelNode(theme: ThemeId, index: number): LevelNode {
  return LEVEL_TREE[theme][index - 1]
}

// ── 小游戏元数据（ADR-0014）──
export interface MiniGameMeta {
  id: MiniGameId
  theme?: ThemeId // 主题小游戏所属主题；彩蛋小游戏（race）无主题
  name: string
  emoji: string
  description: string
  gradient: string
}

export const MINI_GAMES: MiniGameMeta[] = [
  {
    id: 'car',
    theme: 'car',
    name: '汽车组装',
    emoji: '🚗',
    description: '把车身、轮子和车灯装成一辆小汽车',
    gradient: THEMES.car.gradient,
  },
  {
    id: 'history',
    theme: 'history',
    name: '文物拼图',
    emoji: '🏺',
    description: '把打乱的拼图块还原成古代宝贝',
    gradient: THEMES.history.gradient,
  },
  {
    id: 'minecraft',
    theme: 'minecraft',
    name: '挖矿大作战',
    emoji: '⛏️',
    description: '30 秒挖钻石，小心点中苦力怕！',
    gradient: THEMES.minecraft.gradient,
  },
  {
    id: 'race',
    name: '摩托大乱斗',
    emoji: '🏍️',
    description: '3 车道竞速，撞开对手冲第一！',
    gradient: 'from-sky-500 to-indigo-500',
  },
]

export function miniGameCardId(id: MiniGameId): string {
  return id === 'race' ? 'mg-race' : `mg-${id}`
}

// ── 难度元数据（ADR-0016）：4 档年级制 ──
export interface DifficultyMeta {
  id: Difficulty
  label: string
  emoji: string
  age: string
  color: string // 徽章配色（Tailwind 类）
}

export const DIFFICULTIES: DifficultyMeta[] = [
  { id: 'starter', label: '启蒙', emoji: '🌱', age: '大班~1年级', color: 'border-green-300 bg-green-100 text-green-700' },
  { id: 'beginner', label: '初级', emoji: '⭐', age: '2年级', color: 'border-sky-300 bg-sky-100 text-sky-700' },
  { id: 'intermediate', label: '中级', emoji: '🚀', age: '3-4年级', color: 'border-orange-300 bg-orange-100 text-orange-700' },
  { id: 'advanced', label: '高级', emoji: '👑', age: '5-6年级', color: 'border-rose-300 bg-rose-100 text-rose-700' },
]
