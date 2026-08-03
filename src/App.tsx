import { useCallback, useRef, useState } from 'react'
import type { LevelNode, LevelResult, Question, ThemeId } from './types'
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

type Screen =
  | { name: 'home' }
  | { name: 'theme'; theme: ThemeId }
  | { name: 'quiz'; theme: ThemeId; node: LevelNode; questions: Question[] }
  | { name: 'result'; theme: ThemeId; node: LevelNode; result: LevelResult }
  | { name: 'collection'; theme: ThemeId }
  | { name: 'mini-hall' }
  | { name: 'mini-play'; theme: ThemeId }
  | { name: 'parent' }

function Shell() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const { save, addPlayTime } = useSave()
  const quizStartRef = useRef<number>(0)

  const enterQuiz = useCallback(
    (theme: ThemeId, node: LevelNode) => {
      const { mistakePool } = save.themeProgress[theme]
      const questions = buildLevelQuestions(theme, node, mistakePool, loadCustomBank())
      quizStartRef.current = Date.now()
      setScreen({ name: 'quiz', theme, node, questions })
    },
    [save.themeProgress],
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
        theme={screen.theme}
        onBack={() => setScreen({ name: 'theme', theme: screen.theme })}
      />
    )
  } else if (screen.name === 'mini-hall') {
    content = (
      <MiniGameHallScreen
        onBack={goHome}
        onPlay={(t) => {
          quizStartRef.current = Date.now() // 小游戏计时起点（ADR-0014）
          setScreen({ name: 'mini-play', theme: t })
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
    content =
      screen.theme === 'car' ? (
        <CarAssemblyGame theme={screen.theme} onExit={back} />
      ) : screen.theme === 'history' ? (
        <RelicPuzzleGame theme={screen.theme} onExit={back} />
      ) : (
        <MiningGame theme={screen.theme} onExit={back} />
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
