import type { Parent, Root, Text } from 'mdast'
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx'
import { REGEX_LIEN_CONCEPT } from '@3datr/core/liens'

/**
 * Transforme [[slug]] et [[slug|texte]] en <LienConcept slug="…" texte="…" />.
 * Le composant affiche la pastille du domaine, le niveau et une bulle de résumé.
 * Les slugs inexistants sont déjà refusés par la validation du contenu.
 */
export function remarkLiensConcepts() {
  return (tree: Root) => {
    const visiter = (parent: Parent) => {
      if (parent.type === 'link' || parent.type === 'linkReference') return
      for (let i = 0; i < parent.children.length; i++) {
        const n = parent.children[i]
        if (n.type === 'text') {
          const remplaces = decouper(n)
          if (remplaces) {
            parent.children.splice(i, 1, ...(remplaces as Parent['children']))
            i += remplaces.length - 1
          }
        } else if ('children' in n) visiter(n as Parent)
      }
    }
    visiter(tree)
  }
}

function decouper(n: Text): (Text | MdxJsxTextElement)[] | null {
  const re = new RegExp(REGEX_LIEN_CONCEPT.source, 'g')
  const morceaux: (Text | MdxJsxTextElement)[] = []
  let dernier = 0
  for (const m of n.value.matchAll(re)) {
    if (m.index > dernier) morceaux.push({ type: 'text', value: n.value.slice(dernier, m.index) })
    const attributs: MdxJsxTextElement['attributes'] = [{ type: 'mdxJsxAttribute', name: 'slug', value: m[1] }]
    if (m[2]) attributs.push({ type: 'mdxJsxAttribute', name: 'texte', value: m[2].trim() })
    morceaux.push({ type: 'mdxJsxTextElement', name: 'LienConcept', attributes: attributs, children: [] })
    dernier = m.index + m[0].length
  }
  if (!morceaux.length) return null
  if (dernier < n.value.length) morceaux.push({ type: 'text', value: n.value.slice(dernier) })
  return morceaux
}
