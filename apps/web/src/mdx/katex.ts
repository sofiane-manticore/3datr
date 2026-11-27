import type { KatexOptions } from 'katex'

/**
 * Couleurs des variables : la même couleur sert pour le curseur du module
 * et pour la variable dans la formule. Dans le MDX : $\col{rouge}{a} \cdot \col{bleu}{b}$.
 * (Une seule macro \col : des macros \rouge, \vert… écraseraient des commandes KaTeX comme \vert.)
 * Les teintes elles-mêmes sont des variables CSS (--v-rouge…), adaptées au thème.
 */
export const COULEURS_VARIABLES = ['rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet', 'rose'] as const
export type CouleurVariable = (typeof COULEURS_VARIABLES)[number]

export const OPTIONS_KATEX: KatexOptions = {
  macros: { '\\col': '\\htmlClass{v-#1}{#2}' },
  trust: (ctx) => ctx.command === '\\htmlClass',
  strict: (code: string) => (code === 'htmlExtension' ? 'ignore' : 'warn'),
}
