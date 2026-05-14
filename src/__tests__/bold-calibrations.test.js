import { describe, it, expect } from 'vitest'
import { BOLD_CALIBRATIONS } from '../slide-renderer/templates/bold-corner/calibrations.js'

describe('BOLD_CALIBRATIONS', () => {
  it('ha le 3 chiavi square / portrait / landscape', () => {
    expect(Object.keys(BOLD_CALIBRATIONS)).toEqual(['square', 'portrait', 'landscape'])
  })

  it('square — padding verbatim da spec §5.3', () => {
    expect(BOLD_CALIBRATIONS.square.padding).toBe('90px 80px 70px')
  })

  it('portrait — padding verbatim da spec §5.3', () => {
    expect(BOLD_CALIBRATIONS.portrait.padding).toBe('120px 80px 100px')
  })

  it('landscape — padding verbatim da spec §5.3', () => {
    expect(BOLD_CALIBRATIONS.landscape.padding).toBe('55px 80px 45px')
  })

  it('square — corner_size 240px (spec §5.3, diverso da implementazione originale 200px)', () => {
    expect(BOLD_CALIBRATIONS.square.corner_size).toBe('240px')
  })

  it('square — body_archivo cover: size 110, line_height 0.95', () => {
    expect(BOLD_CALIBRATIONS.square.body_archivo.cover).toEqual({ size: 110, line_height: 0.95 })
  })

  it('portrait — body_archivo cover: size 120', () => {
    expect(BOLD_CALIBRATIONS.portrait.body_archivo.cover.size).toBe(120)
  })

  it('landscape — body_archivo cover: size 68', () => {
    expect(BOLD_CALIBRATIONS.landscape.body_archivo.cover.size).toBe(68)
  })

  it('square — body_fraunces xl: size 86', () => {
    expect(BOLD_CALIBRATIONS.square.body_fraunces.xl.size).toBe(86)
  })

  it('ogni format ha quote_attr con size, source_size e margin_top', () => {
    for (const fmt of ['square', 'portrait', 'landscape']) {
      const qa = BOLD_CALIBRATIONS[fmt].quote_attr
      expect(qa).toHaveProperty('size')
      expect(qa).toHaveProperty('source_size')
      expect(qa).toHaveProperty('margin_top')
    }
  })

  it('ogni format ha swipe_bottom definito', () => {
    for (const fmt of ['square', 'portrait', 'landscape']) {
      expect(BOLD_CALIBRATIONS[fmt].swipe_bottom).toBeTruthy()
    }
  })

  it('ogni format ha divider_num con size e top', () => {
    for (const fmt of ['square', 'portrait', 'landscape']) {
      const dn = BOLD_CALIBRATIONS[fmt].divider_num
      expect(dn).toHaveProperty('size')
      expect(dn).toHaveProperty('top')
    }
  })

  it('ogni format ha cta_item con size, line_height e gap', () => {
    for (const fmt of ['square', 'portrait', 'landscape']) {
      const ci = BOLD_CALIBRATIONS[fmt].cta_item
      expect(ci).toHaveProperty('size')
      expect(ci).toHaveProperty('line_height')
      expect(ci).toHaveProperty('gap')
    }
  })
})
