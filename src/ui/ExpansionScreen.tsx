import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Question, ThemeId } from '../types'
import { THEMES } from '../data/themes'
import { playClick } from '../audio/sfx'
import { speak, stopSpeaking } from '../audio/tts'
import { useSave } from '../store/save'

interface Props {
  theme: ThemeId
  question: Question
  onBack: () => void
}

/** 来源页面截图（图片为空时从来源 URL 获取，ADR-0013） */
function sourceScreenshotUrl(sourceUrl?: string): string | undefined {
  if (!sourceUrl) return undefined
  return `https://api.microlink.io/?url=${encodeURIComponent(sourceUrl)}&screenshot=true&meta=false&embed=screenshot.url`
}

/** 知识扩展页（ADR-0013）：大字标题 + 短图文正文 + 来源 + https 白名单外链 */
export function ExpansionScreen({ theme, question, onBack }: Props) {
  const meta = THEMES[theme]
  const { save } = useSave()
  const exp = question.expansion
  // 图片：显式 image URL 优先；为空则用来源页面截图；截图失败回退 emoji
  const [imgFailed, setImgFailed] = useState(false)
  const imgSrc = exp?.image ?? (!imgFailed ? sourceScreenshotUrl(exp?.sourceUrl) : undefined)

  // 进入自动朗读正文（孩子识字量有限）
  useEffect(() => {
    if (!save.settings.muted && exp) speak(`${exp.title}。${exp.body}`)
    return () => stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!exp) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4">
        <div className="text-5xl">🤔</div>
        <p className="text-lg font-bold text-slate-600">这道题还没有知识扩展</p>
        <button
          onClick={() => {
            playClick()
            onBack()
          }}
          className="rounded-full bg-white px-6 py-2 font-bold text-slate-600 shadow"
        >
          ← 返回
        </button>
      </div>
    )
  }

  return (
    <div className={`flex min-h-screen flex-col ${meta.mapBg} px-4 pb-10`}>
      <div className="mx-auto w-full max-w-md pt-4">
        <button
          onClick={() => {
            playClick()
            stopSpeaking()
            onBack()
          }}
          className="rounded-full bg-white/80 px-4 py-1.5 font-bold text-slate-600 shadow"
        >
          ← 返回
        </button>

        {/* 图文卡片 */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-4 overflow-hidden rounded-3xl bg-white shadow-xl"
        >
          {/* 插图区：显式 image URL 优先，为空用来源页面截图，失败回退 emoji（ADR-0013） */}
          <div
            className={`flex h-44 items-center justify-center bg-gradient-to-br ${meta.gradient}`}
          >
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={exp.title}
                onError={() => setImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="text-8xl drop-shadow-lg"
              >
                {question.cardEmoji}
              </motion.div>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-black leading-snug text-slate-800">{exp.title}</h1>
              <button
                aria-label="朗读"
                onClick={() => speak(`${exp.title}。${exp.body}`)}
                className="shrink-0 rounded-full bg-sky-100 p-2.5 text-xl"
              >
                🔊
              </button>
            </div>

            <p className="mt-3 text-lg font-bold leading-relaxed text-slate-700">{exp.body}</p>

            {/* 来源：文本 + 完整 URL（ADR-0013） */}
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-2.5">
              <div className="text-sm font-bold text-slate-500">📚 {exp.source}</div>
              {exp.sourceUrl && (
                <a
                  href={exp.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block break-all text-xs font-bold text-indigo-500 hover:underline"
                >
                  🔗 {exp.sourceUrl}
                </a>
              )}
            </div>

            {/* 外链（https 白名单，rel=noopener，ADR-0013） */}
            {exp.links && exp.links.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-black text-slate-500">想了解更多？点这里：</div>
                <div className="mt-2 flex flex-col gap-2">
                  {exp.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2.5 font-bold text-indigo-600 shadow-sm transition active:scale-95"
                    >
                      🔗 {link.label}
                      <span className="ml-auto text-xs text-indigo-300">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <p className="mt-4 text-center text-xs text-slate-500">
          {question.cardName} · {question.prompt}
        </p>
      </div>
    </div>
  )
}
