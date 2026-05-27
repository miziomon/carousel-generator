import { BOLD_CALIBRATIONS } from './calibrations.js'
import { BoldCoverSlide }    from './BoldCoverSlide.jsx'
import { BoldStandardSlide } from './BoldStandardSlide.jsx'
import { BoldDividerSlide }  from './BoldDividerSlide.jsx'
import { BoldCtaSlide }      from './BoldCtaSlide.jsx'
import { BoldQuoteSlide }    from './BoldQuoteSlide.jsx'
import { SwipeArrow }        from '../_shared/SwipeArrow.jsx'

export function BoldCorner({ slide, theme, total, mode }) {
  const calib = BOLD_CALIBRATIONS[theme?.format] ?? BOLD_CALIBRATIONS.square

  const containerStyle = {
    '--bold-padding':                calib.padding,
    '--bold-corner-size':            calib.corner_size,
    '--bold-slash-size':             calib.slash_size,
    '--bold-slash-top':              calib.slash_top,
    '--bold-num-size':               calib.num_size,
    '--bold-num-padding':            calib.num_padding,
    '--bold-kicker-size':            calib.kicker_size,
    '--bold-foot-padding-top':       calib.foot_padding_top,
    '--bold-foot-name-size':         calib.foot_name_size,
    '--bold-foot-meta-size':         calib.foot_meta_size,
    '--bold-divider-num-size':       `${calib.divider_num.size}px`,
    '--bold-divider-num-top':        `${calib.divider_num.top}px`,
    '--bold-cta-size':               `${calib.cta_item.size}px`,
    '--bold-cta-line-height':        calib.cta_item.line_height * (theme.lineHeight ?? 1),
    '--bold-cta-gap':                `${calib.cta_item.gap}px`,
    '--bold-swipe-bottom':           calib.swipe_bottom,
    '--bold-quote-attr-size':        calib.quote_attr.size,
    '--bold-quote-attr-source-size': calib.quote_attr.source_size,
    '--bold-quote-attr-margin-top':  calib.quote_attr.margin_top,
  }

  let SlideContent

  switch (slide.type) {
    case 'cover':    SlideContent = BoldCoverSlide;    break
    case 'standard': SlideContent = BoldStandardSlide; break
    case 'divider':  SlideContent = BoldDividerSlide;  break
    case 'cta':      SlideContent = BoldCtaSlide;      break
    case 'quote':    SlideContent = BoldQuoteSlide;    break
    default:
      return (
        <div className="bold" style={containerStyle}>
          <div style={{ margin: 'auto', color: 'red', fontFamily: 'monospace', fontSize: 24 }}>
            Tipo slide sconosciuto: {slide.type}
          </div>
        </div>
      )
  }

  return (
    <div className="bold" style={containerStyle}>
      <SlideContent slide={slide} theme={theme} total={total} mode={mode} calib={calib} />
      <SwipeArrow
        slide={slide}
        total={total}
        theme={theme}
        label="→ SWIPE"
        className="bold__swipe-mini"
      />
    </div>
  )
}
