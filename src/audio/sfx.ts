// Web Audio 合成音效（零素材零版权，见 ADR-0010）

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.2) {
  const ac = audioCtx()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, ac.currentTime + start)
  gain.gain.exponentialRampToValueAtTime(volume, ac.currentTime + start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(ac.currentTime + start)
  osc.stop(ac.currentTime + start + duration + 0.05)
}

/** 答对：上行双音 */
export function playCorrect() {
  tone(523.25, 0, 0.18, 'triangle') // C5
  tone(659.25, 0.09, 0.25, 'triangle') // E5
}

/** 答错：低频下滑 */
export function playWrong() {
  tone(220, 0, 0.2, 'sawtooth', 0.12)
  tone(164.81, 0.12, 0.28, 'sawtooth', 0.12) // E3
}

/** 星星：叮 */
export function playStar() {
  tone(1318.5, 0, 0.3, 'sine', 0.18) // E6
}

/** 过关庆祝：琶音 */
export function playFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
  notes.forEach((f, i) => tone(f, i * 0.12, 0.35, 'triangle', 0.22))
}

/** 点击 */
export function playClick() {
  tone(880, 0, 0.06, 'square', 0.08)
}
