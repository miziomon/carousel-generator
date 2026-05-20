import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeSidebarHeader } from './ThemeSidebarHeader.jsx'
import { ThemeSidebarRail } from './ThemeSidebarRail.jsx'
import { FormatSection }   from './sections/FormatSection.jsx'
import { TemplateSection } from './sections/TemplateSection.jsx'
import { PaletteSection }  from './sections/PaletteSection.jsx'
import { HeaderSection }   from './sections/HeaderSection.jsx'
import { FooterSection }   from './sections/FooterSection.jsx'
import { FontsSection }    from './sections/FontsSection.jsx'
import { ImageSection }     from './sections/ImageSection.jsx'
import { CustomCssSection } from './sections/CustomCssSection.jsx'
import { ResetSection }     from './sections/ResetSection.jsx'
import './theme-sidebar.css'
import '../theme-tab/theme-tab.css'

const SIDEBAR_WIDTH = 300
const RAIL_WIDTH    = 28

/**
 * Sidebar fissa a sinistra contenente tutti i controlli del tema.
 * Su desktop (isDesktop=true): sidebar inline con animazione width.
 * Su mobile (isDesktop=false): drawer overlay con backdrop + chiusura su Esc.
 */
export function ThemeSidebar({
  isOpen,
  onToggle,
  isDesktop,
  theme,
  carousel,
  onChange,
  paletteLibrary,
  applyPalette,
  resyncPalette,
  updatePaletteInline,
  openPaletteManager,
  applyTemplate,
  openTemplateManager,
  applyFormat,
  uiPrefs,
  setSectionOpen,
  setFontShowAll,
  applyFont,
  applyFontPreset,
  previewFontChange,
  clearFontPreview,
  applyFontSize,
  setCustomCss,
  applyThemeBgImage,
}) {
  const sections = uiPrefs?.sidebarSections ?? {}

  function handleToggleSection(id, open) {
    setSectionOpen?.(id, open)
  }

  // Esc chiude il drawer in modalità mobile
  useEffect(() => {
    if (isDesktop || !isOpen) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onToggle()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, isOpen, onToggle])

  const sidebarContent = (
    <>
      <ThemeSidebarHeader onToggle={onToggle} />
      <div className="theme-sidebar__content">
        <FormatSection
          isOpen={sections.formato ?? true}
          onToggle={handleToggleSection}
          theme={theme}
          applyFormat={applyFormat}
        />
        <TemplateSection
          isOpen={sections.template ?? true}
          onToggle={handleToggleSection}
          theme={theme}
          applyTemplate={applyTemplate}
          openTemplateManager={openTemplateManager}
          paletteLibrary={paletteLibrary}
          applyPalette={applyPalette}
        />
        <PaletteSection
          isOpen={sections.palette ?? true}
          onToggle={handleToggleSection}
          theme={theme}
          paletteLibrary={paletteLibrary}
          applyPalette={applyPalette}
          resyncPalette={resyncPalette}
          updatePaletteInline={updatePaletteInline}
          openPaletteManager={openPaletteManager}
        />
        <HeaderSection
          isOpen={sections.header ?? false}
          onToggle={handleToggleSection}
          theme={theme}
          onChange={onChange}
        />
        <FooterSection
          isOpen={sections.footer ?? false}
          onToggle={handleToggleSection}
          theme={theme}
          onChange={onChange}
        />
        <FontsSection
          isOpen={sections.fonts ?? false}
          onToggle={handleToggleSection}
          theme={theme}
          fontShowAll={uiPrefs?.fontShowAll ?? false}
          onSetFontShowAll={setFontShowAll}
          onApplyFont={applyFont}
          onApplyFontPreset={applyFontPreset}
          onPreviewFont={previewFontChange}
          onClearFontPreview={clearFontPreview}
          onApplyFontSize={applyFontSize}
          onApplyLineHeight={(v) => onChange({ ...theme, lineHeight: v })}
        />
        <ImageSection
          isOpen={sections.image ?? false}
          onToggle={handleToggleSection}
          theme={theme}
          carousel={carousel}
          applyThemeBgImage={applyThemeBgImage}
        />
        <CustomCssSection
          isOpen={sections.customCss ?? false}
          onToggle={handleToggleSection}
          customCss={theme.customCss ?? ''}
          setCustomCss={setCustomCss}
        />
        <ResetSection
          isOpen={sections.reset ?? false}
          onToggle={handleToggleSection}
          onChange={onChange}
        />
      </div>
    </>
  )

  // ── Desktop: sidebar inline collassabile ──────────────────────────────────
  if (isDesktop) {
    return (
      <motion.aside
        initial={false}
        animate={{ width: isOpen ? SIDEBAR_WIDTH : RAIL_WIDTH }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className={`theme-sidebar${isOpen ? ' theme-sidebar--open' : ' theme-sidebar--closed'}`}
      >
        <AnimatePresence initial={false} mode="wait">
          {isOpen ? (
            <motion.div
              key="open"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="theme-sidebar__inner"
            >
              {sidebarContent}
            </motion.div>
          ) : (
            <motion.div
              key="closed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <ThemeSidebarRail onOpen={onToggle} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    )
  }

  // ── Mobile: drawer overlay con backdrop ───────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="theme-sidebar__backdrop"
            onClick={onToggle}
            aria-hidden="true"
          />
          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: -SIDEBAR_WIDTH, opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -SIDEBAR_WIDTH, opacity: 0.5 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="theme-sidebar theme-sidebar--open theme-sidebar--drawer"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <div className="theme-sidebar__inner">
              {sidebarContent}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
