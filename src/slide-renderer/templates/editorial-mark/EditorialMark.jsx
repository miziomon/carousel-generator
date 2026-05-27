import { EDITORIAL_CALIBRATIONS } from './calibrations.js'
import { EditorialCoverSlide }    from './EditorialCoverSlide.jsx'
import { EditorialStandardSlide } from './EditorialStandardSlide.jsx'
import { EditorialDividerSlide }  from './EditorialDividerSlide.jsx'
import { EditorialCtaSlide }      from './EditorialCtaSlide.jsx'
import { EditorialQuoteSlide }    from './EditorialQuoteSlide.jsx'
import { SwipeArrow }             from '../_shared/SwipeArrow.jsx'

// Router del template: smista per slide.type e avvolge tutto nel container .editorial
export function EditorialMark({ slide, theme, total, mode }) {
  const calib = EDITORIAL_CALIBRATIONS[theme?.format] ?? EDITORIAL_CALIBRATIONS.square

  const containerStyle = {
    '--editorial-padding':                calib.padding,
    '--editorial-topline-top':            calib.topline_top,
    '--editorial-dot-top':                calib.dot_top,
    '--editorial-num-padding-top':        calib.num_padding_top,
    '--editorial-num-size':               calib.num_size,
    '--editorial-kicker-size':            calib.kicker_size,
    '--editorial-foot-padding-top':       calib.foot_padding_top,
    '--editorial-foot-name-size':         calib.foot_name_size,
    '--editorial-foot-meta-size':         calib.foot_meta_size,
    '--editorial-swipe-bottom':           calib.swipe_bottom,
    '--editorial-divider-num-size':       `${calib.divider_num.size}px`,
    '--editorial-divider-num-top':        `${calib.divider_num.top}px`,
    '--editorial-cta-size':               `${calib.cta_item.size}px`,
    '--editorial-cta-line-height':        calib.cta_item.line_height * (theme.lineHeight ?? 1),
    '--editorial-cta-gap':                `${calib.cta_item.gap}px`,
    '--editorial-quote-attr-size':        calib.quote_attr.size,
    '--editorial-quote-attr-source-size': calib.quote_attr.source_size,
    '--editorial-quote-attr-margin-top':  calib.quote_attr.margin_top,
  }

  let SlideContent

  switch (slide.type) {
    case 'cover':    SlideContent = EditorialCoverSlide;    break
    case 'standard': SlideContent = EditorialStandardSlide; break
    case 'divider':  SlideContent = EditorialDividerSlide;  break
    case 'cta':      SlideContent = EditorialCtaSlide;      break
    case 'quote':    SlideContent = EditorialQuoteSlide;    break
    default:
      return (
        <div className="editorial" style={containerStyle}>
          <div style={{ margin: 'auto', color: 'red', fontFamily: 'monospace', fontSize: 24 }}>
            Tipo slide sconosciuto: {slide.type}
          </div>
        </div>
      )
  }

  return (
    <div className="editorial" style={containerStyle}>
      <SlideContent slide={slide} theme={theme} total={total} mode={mode} calib={calib} />
      <SwipeArrow
        slide={slide}
        total={total}
        theme={theme}
        label="SCORRI →"
        className="editorial__swipe-mini"
      />
    </div>
  )
}
