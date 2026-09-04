// The equalizer dialog: a switch, five bands, the booster, and the truth
// about whether this browser can do it.
//
// Everything here writes straight into the engine's AudioChain as the
// slider moves, so the sound answers the hand. The dialog is opened from the
// player bar's ⋯ menu, or from its own button in the opened player on a
// phone, where the menu has nothing else left to hold.

import { t } from '../../shared/i18n.ts'
import { BANDS, BAND_RANGE, BOOST_MAX, eqRefused } from '../audio.ts'
import { h, icon, replace } from './dom.ts'
import type { Ctx } from './ctx.ts'
import { holdModal, modalClass, modalHead } from './overlay.ts'

/** A band's label: hertz below a thousand, kilohertz above, the way a hi-fi prints them. */
function bandLabel(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toString().replace(/\.0$/, '')} kHz` : `${hz} Hz`
}

/** Paints how much of a slider is behind the thumb, the way the bar's sliders do. */
function fill(el: HTMLInputElement): void {
  const min = Number(el.min)
  const max = Number(el.max)
  const ratio = (Number(el.value) - min) / (max - min)
  el.style.setProperty('--p', `${Math.max(0, Math.min(1, ratio)) * 100}%`)
}

const dB = (v: number) => (v > 0 ? `+${v} dB` : `${v} dB`)

export function openEqualizer(ctx: Ctx): void {
  const audio = ctx.engine.audio
  let closed = false
  const release = holdModal()
  const done = () => {
    if (closed) return
    closed = true
    release()
    off()
    document.removeEventListener('keydown', onEscape, true)
    scrim.remove()
  }
  const onEscape = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape') return
    const floating = ctx.overlay.querySelectorAll('.menu, .scrim')
    if (floating[floating.length - 1] !== scrim) return
    ev.stopPropagation()
    ev.preventDefault()
    done()
  }

  const body = h('div', { class: 'eqBody' })

  function draw(): void {
    const on = audio.on
    const refused = eqRefused()
    const toggle = h(
      'button',
      {
        class: on ? 'btn primary' : 'btn',
        'data-nav': '',
        'aria-pressed': String(on),
        disabled: refused ? '' : undefined,
        onclick: () => {
          if (on) audio.disable()
          else audio.enable(ctx.engine.media)
          draw()
        },
      },
      on ? t('켜짐') : t('꺼짐'),
    )
    const rows = BANDS.map((hz, i) => {
      const input = h('input', { type: 'range', min: String(-BAND_RANGE), max: String(BAND_RANGE), step: '1', value: String(audio.settings.bands[i] ?? 0), 'data-nav': '', 'aria-label': bandLabel(hz) })
      const val = h('span', { class: 'val' }, dB(audio.settings.bands[i] ?? 0))
      fill(input)
      input.addEventListener('input', () => {
        audio.setBand(i, Number(input.value))
        val.textContent = dB(Number(input.value))
        fill(input)
      })
      return h('label', { class: 'eqRow' }, h('span', { class: 'lbl' }, bandLabel(hz)), input, val)
    })
    const boost = h('input', { type: 'range', min: '100', max: String(BOOST_MAX * 100), step: '10', value: String(Math.round(audio.settings.boost * 100)), 'data-nav': '', 'aria-label': t('볼륨 부스터') })
    const boostVal = h('span', { class: 'val' }, `${Math.round(audio.settings.boost * 100)}%`)
    fill(boost)
    boost.addEventListener('input', () => {
      audio.setBoost(Number(boost.value) / 100)
      boostVal.textContent = `${boost.value}%`
      fill(boost)
    })

    replace(
      body,
      h('div', { class: 'eqSwitch' }, h('div', null, h('div', null, t('이퀄라이저')), h('div', { class: 'sub' }, t('켜면 소리가 이 확장을 거쳐 나옵니다. 소리가 나지 않는 브라우저에서는 스스로 꺼집니다.'))), toggle),
      refused &&
        h(
          'div',
          { class: 'eqRefused' },
          h('div', { class: 'err' }, t('이 브라우저에서는 이퀄라이저를 쓸 수 없습니다.')),
          h('button', { class: 'btn ghost', 'data-nav': '', onclick: () => { audio.retry(ctx.engine.media); draw() } }, t('다시 시도')),
        ),
      h('div', { class: on ? 'eqBands' : 'eqBands off' }, rows, h('label', { class: 'eqRow boost' }, h('span', { class: 'lbl' }, t('볼륨 부스터')), boost, boostVal)),
    )
  }

  // Redrawn when the chain speaks for itself: a refusal while this is open
  // has to show up here, not only in the toast.
  const off = audio.subscribe((ev) => {
    if (ev === 'refused') draw()
  })

  const scrim = h(
    'div',
    { class: 'scrim', 'data-remote': '', onclick: (ev) => ev.target === scrim && done() },
    h(
      'div',
      { class: `${modalClass()} equalizer`, role: 'dialog' },
      modalHead(t('이퀄라이저'), done),
      body,
      h('div', { class: 'new', style: 'justify-content: flex-end' }, h('button', { class: 'btn ghost', 'data-nav': '', onclick: () => { audio.reset(); draw() } }, icon('repeat', 16), t('기본값으로'))),
    ),
  )
  draw()
  ctx.overlay.appendChild(scrim)
  document.addEventListener('keydown', onEscape, true)
  scrim.querySelector<HTMLElement>('.eqSwitch .btn')?.focus()
}
