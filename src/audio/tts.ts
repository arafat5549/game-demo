// 浏览器 TTS 中文朗读封装（见 ADR-0010）

let supported = false
try {
  supported = typeof window !== 'undefined' && 'speechSynthesis' in window
} catch {
  supported = false
}

export function isTtsSupported(): boolean {
  return supported
}

export function speak(text: string, rate = 0.9) {
  if (!supported) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  u.rate = rate
  u.pitch = 1.1
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (!supported) return
  window.speechSynthesis.cancel()
}
