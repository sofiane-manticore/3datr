import { useEffect, useState } from 'react'
import { COULEURS_VARIABLES, type CouleurVariable } from '../mdx/katex'

/**
 * Les couleurs du thème lues dans les variables CSS, pour les scènes WebGL et les canevas
 * qui ne savent pas lire `var(--…)`. Relues quand on change de thème : la flèche rouge
 * de la scène reste exactement la teinte du `\col{rouge}{a}` de la formule.
 */
export interface Jetons {
  fond: string
  surface: string
  surface2: string
  bord: string
  texte: string
  doux: string
  accent: string
  variables: Record<CouleurVariable, string>
  theme: 'sombre' | 'clair'
}

const SOMBRE: Jetons = {
  fond: '#0f1115',
  surface: '#171a21',
  surface2: '#1f232c',
  bord: '#2b303b',
  texte: '#e8eaef',
  doux: '#9aa2b1',
  accent: '#7c9cff',
  variables: { rouge: '#ff6b6b', orange: '#ff9f43', jaune: '#ffd43b', vert: '#51cf66', bleu: '#4dabf7', violet: '#b197fc', rose: '#f783ac' },
  theme: 'sombre',
}

function lire(): Jetons {
  if (typeof document === 'undefined') return SOMBRE
  const s = getComputedStyle(document.documentElement)
  const v = (nom: string, repli: string) => s.getPropertyValue(nom).trim() || repli
  return {
    fond: v('--fond', SOMBRE.fond),
    surface: v('--surface', SOMBRE.surface),
    surface2: v('--surface-2', SOMBRE.surface2),
    bord: v('--bord', SOMBRE.bord),
    texte: v('--texte', SOMBRE.texte),
    doux: v('--doux', SOMBRE.doux),
    accent: v('--accent', SOMBRE.accent),
    variables: Object.fromEntries(COULEURS_VARIABLES.map((c) => [c, v(`--v-${c}`, SOMBRE.variables[c])])) as Jetons['variables'],
    theme: document.documentElement.dataset.theme === 'clair' ? 'clair' : 'sombre',
  }
}

export function useJetons(): Jetons {
  const [j, setJ] = useState<Jetons>(lire)
  useEffect(() => {
    setJ(lire())
    const obs = new MutationObserver(() => setJ(lire()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return j
}

/** Une couleur de variable (« rouge ») ou une couleur CSS libre (« #fff »). */
export const teinte = (j: Jetons, c: CouleurVariable | string) => (c in j.variables ? j.variables[c as CouleurVariable] : c)
export const cssVariable = (c: CouleurVariable | string | undefined) =>
  c ? ((COULEURS_VARIABLES as readonly string[]).includes(c) ? `var(--v-${c})` : c) : 'var(--accent)'
