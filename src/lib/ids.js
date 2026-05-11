import { nanoid } from 'nanoid'

// Genera un id runtime stabile per le slide (10 char, URL-safe)
export function newId() {
  return nanoid(10)
}
