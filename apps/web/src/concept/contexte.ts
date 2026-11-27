import { createContext, useContext } from 'react'
import type { DonneesConcept } from '../lib/types'

export const ContexteConcept = createContext<DonneesConcept | null>(null)

export function useConcept(): DonneesConcept {
  const d = useContext(ContexteConcept)
  if (!d) throw new Error('useConcept hors d’une page concept')
  return d
}
