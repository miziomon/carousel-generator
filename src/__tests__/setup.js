import '@testing-library/jest-dom'

// Node 25+ espone un localStorage sperimentale che, senza --localstorage-file,
// oscura quello di jsdom e risulta non utilizzabile (undefined). Se manca un
// Storage funzionante se ne installa uno in memoria, così i test sono uguali
// su ogni versione di Node (la CI usa la 22, in locale può essere più recente).
function hasWorkingStorage() {
  try {
    return typeof globalThis.localStorage?.clear === 'function'
  } catch {
    return false
  }
}

if (!hasWorkingStorage()) {
  const store = new Map()
  const memoryStorage = {
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => { store.set(String(k), String(v)) },
    removeItem: (k) => { store.delete(String(k)) },
    clear: () => { store.clear() },
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true, writable: true })
}
