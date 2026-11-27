import katex from 'katex'
import { useMemo } from 'react'
import { OPTIONS_KATEX } from '../mdx/katex'

/**
 * Formule recalculée en direct, avec les mêmes couleurs de variables que le texte :
 *   <FormuleLive tex={`\\col{rouge}{\\vec a}\\cdot\\col{bleu}{\\vec b} = ${formater(d)}`} />
 */
export function FormuleLive({ tex, bloc = false, className = '' }: { tex: string; bloc?: boolean; className?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { ...OPTIONS_KATEX, displayMode: bloc, throwOnError: false })
    } catch {
      return tex
    }
  }, [tex, bloc])
  return <span className={`formule-live ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}
