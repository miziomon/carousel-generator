import { usePwaUpdate } from '../../hooks/usePwaUpdate.js'
import { UpdateToast } from './UpdateToast.jsx'

/**
 * Registra il service worker e mostra l'avviso di nuova versione.
 * Montato a livello radice (main.jsx), così compare anche sulla schermata di login.
 */
export function PwaUpdateNotice() {
  const { needRefresh, dismiss, reload } = usePwaUpdate()
  return <UpdateToast visible={needRefresh} onReload={reload} onDismiss={dismiss} />
}
