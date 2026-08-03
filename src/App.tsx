import { useCallback, useRef, useState } from 'react'
import type { LevelNode, LevelResult, MiniGameId, Question, ThemeId } from './types'
import { SaveProvider, useSave } from './store/save'
import { levelNode } from './data/themes'
import { buildLevelQuestions } from './game/engine'
import { loadCustomBank } from './game/customBank'
import { HomeScreen } from './ui/HomeScreen'
import { ThemeMapScreen } from './ui/ThemeMapScreen'
import { QuizScreen } from './ui/QuizScreen'
import { ResultScreen } from './ui/ResultScreen'
import { CollectionScreen } from './ui/CollectionScreen'
import { ParentZone } from './ui/ParentZone'
import { MiniGameHallScreen } from './ui/MiniGameHallScreen'
import { CarAssemblyGame } from './ui/minigames/CarAssemblyGame'
import { RelicPuzzleGame } from './ui/minigames/RelicPuzzleGame'
import { MiningGame } from './ui/minigames/MiningGame'
// TODO(协调者): race 分发将在此 import MotorbikeRushGame（src/ui/minigames/MotorbikeRushGame.tsx，
// 由另一个任务创建，本任务不创建/不引入，仅留接口）

type Screen =
  | { name: 'home' }
  | { name: 'theme'; theme: ThemeId }
  | { name: 'quiz'; theme: ThemeId; node: LevelNode; questions: Question[] }
  | { name: 'result'; theme: ThemeId; node: LevelNode; result: LevelResult }
  | { name: 'collection'; theme: ThemeId }
  | { name: 'collection-bonus' }
  | { name: 'mini-hall' }
  | { name: 'mini-play'; theme: MiniGameId }
  | { name: 'parent' }

function Shell() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const { save, addPlayTime } = useSave()
  const quizStartRef = useRef<number>(0)

  const enterQuiz = useCallback(
    (theme: ThemeId, node: LevelNode) => {
      const { mistakePool } = save.themeProgress[theme]
      const questions = buildLevelQuestions(
        theme,
        node,
        mistakePool,
        loadCustomBank(),
        save.settings.difficulty, // 全局难度（ADR-0016）
      )
      quizStartRef.current = Date.now()
      setScreen({ name: 'quiz', theme, node, questions })
    },
    [save.themeProgress, save.settings.difficulty],
  )

  const finishQuiz = useCallback(
    (theme: ThemeId, node: LevelNode, result: LevelResult, toNext: boolean) => {
      // 计入每日游玩时长（按整分钟）
      const minutes = Math.max(1, Math.round((Date.now() - quizStartRef.current) / 60000))
      addPlayTime(minutes)
      if (toNext && node.index < 10) {
        // 直接进入下一关：按关卡树取节点并出题
        enterQuiz(theme, levelNode(theme, node.index + 1))
        return
      }
      setScreen({ name: 'result', theme, node, result })
    },
    [addPlayTime, enterQuiz],
  )

  const goHome = useCallback(() => setScreen({ name: 'home' }), [])

  const limit = save.settings.dailyLimitMinutes
  const overLimit = limit > 0 && save.settings.todayPlayedMinutes >= limit

  let content: React.ReactNode
  if (screen.name === 'home') {
    content = (
      <HomeScreen
        onEnterTheme={(t) => setScreen({ name: 'theme', theme: t })}
        onOpenParent={() => setScreen({ name: 'parent' })}
        onOpenMiniHall={() => setScreen({ name: 'mini-hall' })}
        onOpenBonusCollection={() => setScreen({ name: 'collection-bonus' })}
        overLimit={overLimit}
      />
    )
  } else if (screen.name === 'theme') {
    content = (
      <ThemeMapScreen
        theme={screen.theme}
        onBack={goHome}
        onEnterLevel={enterQuiz}
        onOpenCollection={() => setScreen({ name: 'collection', theme: screen.theme })}
      />
    )
  } else if (screen.name === 'quiz') {
    content = (
      <QuizScreen
        theme={screen.theme}
        node={screen.node}
        questions={screen.questions}
        onFinish={finishQuiz}
        onAbort={() => setScreen({ name: 'theme', theme: screen.theme })}
      />
    )
  } else if (screen.name === 'result') {
    content = (
      <ResultScreen
        theme={screen.theme}
        node={screen.node}
        result={screen.result}
        onRetry={() => enterQuiz(screen.theme, screen.node)}
        onBack={() => setScreen({ name: 'theme', theme: screen.theme })}
      />
    )
  } else if (screen.name === 'collection') {
    content = (
      <CollectionScreen
        variant={{ type: 'theme', theme: screen.theme }}
        onBack={() => setScreen({ name: 'theme', theme: screen.theme })}
      />
    )
  } else if (screen.name === 'collection-bonus') {
    content = <CollectionScreen variant={{ type: 'bonus' }} onBack={goHome} />
  } else if (screen.name === 'mini-hall') {
    content = (
      <MiniGameHallScreen
        onBack={goHome}
        onPlay={(id) => {
          quizStartRef.current = Date.now() // 小游戏计时起点（ADR-0014）
          setScreen({ name: 'mini-play', theme: id })
        }}
      />
    )
  } else if (screen.name === 'mini-play') {
    // 退出小游戏时计入每日游玩时长
    const back = () => {
      const minutes = Math.max(1, Math.round((Date.now() - quizStartRef.current) / 60000))
      addPlayTime(minutes)
      setScreen({ name: 'mini-hall' })
    }
    content = screen.theme === 'car' ? (
      <CarAssemblyGame theme={screen.theme} onExit={back} />
    ) : screen.theme === 'history' ? (
      <RelicPuzzleGame theme={screen.theme} onExit={back} />
    ) : screen.theme === 'minecraft' ? (
      <MiningGame theme={screen.theme} onExit={back} />
    ) : (
      // TODO(协调者): race 引擎接入处——将替换为 <MotorbikeRushGame onExit={back} />
      // 引擎组件（src/ui/minigames/MotorbikeRushGame.tsx）由另一个任务创建，此处先渲染占位提示
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-sky-400 to-indigo-500 p-4 text-center text-white">
        <div className="text-7xl drop-shadow">🏍️</div>
        <div className="text-2xl font-black drop-shadow">摩托大乱斗</div>
        <p className="text-sm text-white/90">3 车道竞速，撞开对手冲第一！（引擎接入中…）</p>
        <button
          onClick={back}
          className="mt-2 rounded-full bg-white/90 px-4 py-1.5 font-bold text-slate-600 shadow"
        >
          ← 返回小游戏厅
        </button>
      </div>
    )
  } else {
    content = <ParentZone onBack={goHome} />
  }

  return <div className="min-h-screen bg-slate-100">{content}</div>
}

export default function App() {
  return (
    <SaveProvider>
      <Shell />
    </SaveProvider>
  )
}
