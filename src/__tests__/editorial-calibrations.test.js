import { describe, it, expect } from 'vitest'
import { EDITORIAL_CALIBRATIONS } from '../slide-renderer/templates/editorial-mark/calibrations.js'

describe('EDITORIAL_CALIBRATIONS', () => {
  it('ha le 3 chiavi square / portrait / landscape', () => {
    expect(Object.keys(EDITORIAL_CALIBRATIONS)).toEqual(['square', 'portrait', 'landscape'])
  })

  it('square — padding verbatim da spec §5.2', () => {
    expect(EDITORIAL_CALIBRATIONS.square.padding).toBe('90px 80px 70px')
  })

  it('portrait — padding verbatim da spec §5.2', () => {
    expect(EDITORIAL_CALIBRATIONS.portrait.padding).toBe('120px 80px 100px')
  })

  it('landscape — padding verbatim da spec §5.2', () => {
    expect(EDITORIAL_CALIBRATIONS.landscape.padding).toBe('55px 80px 45px')
  })

  it('square — body_archivo cover: size 118, line_height 0.98', () => {
    expect(EDITORIAL_CALIBRATIONS.square.body_archivo.cover).toEqual({ size: 118, line_height: 0.98 })
  })

  it('portrait — body_archivo cover: size 128', () => {
    expect(EDITORIAL_CALIBRATIONS.portrait.body_archivo.cover.size).toBe(128)
  })

  it('landscape — body_archivo cover: size 72', () => {
    expect(EDITORIAL_CALIBRATIONS.landscape.body_archivo.cover.size).toBe(72)
  })

  it('square — body_fraunces xl: size 92', () => {
    expect(EDITORIAL_CALIBRATIONS.square.body_fraunces.xl.size).toBe(92)
  })

  it('ogni format ha quote_attr con size, source_size e margin_top', () => {
    for (const fmt of ['square', 'portrait', 'landscape']) {
      const qa = EDITORIAL_CALIBRATIONS[fmt].quote_attr
      expect(qa).toHaveProperty('size')
      expect(qa).toHaveProperty('source_size')
      expect(qa).toHaveProperty('margin_top')
    }
  })

  it('ogni format ha swipe_bottom definito', () => {
    for (const fmt of ['square', 'portrait', 'landscape']) {
      expect(EDITORIAL_CALIBRATIONS[fmt].swipe_bottom).toBeTruthy()
    }
  })

  it('ogni format ha divider_num con size e top', () => {
    for (const fmt of ['square', 'portrait', 'landscape']) {
      const dn = EDITORIAL_CALIBRATIONS[fmt].divider_num
      expect(dn).toHaveProperty('size')
      expect(dn).toHaveProperty('top')
    }
  })

  it('ogni format ha cta_item con size, line_height e gap', () => {
    for (const fmt of ['square', 'portrait', 'landscape']) {
      const ci = EDITORIAL_CALIBRATIONS[fmt].cta_item
      expect(ci).toHaveProperty('size')
      expect(ci).toHaveProperty('line_height')
      expect(ci).toHaveProperty('gap')
    }
  })
})
