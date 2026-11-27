import type { Root, RootContent } from 'mdast'
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx'
import type { VFile } from 'vfile'
import { SECTIONS_REDIGEES, rangSection, sectionDepuisTitre, type IdSectionRedigee } from '@3datr/core/sections'
import { texteDe } from './texte'

/**
 * Découpe le corps MDX d'un concept en sections : chaque titre `## Intuition`,
 * `## La formule`… devient un élément <Section id="intuition"> qui contient tout
 * ce qui suit jusqu'au titre suivant. Le gabarit place ensuite ces sections, le
 * module et les blocs générés dans l'ordre fixe des 9 sections.
 *
 * Un titre inconnu, un doublon, un désordre ou du texte avant la première section
 * font échouer le build (la validation du contenu les signale aussi, plus tôt).
 */
export function remarkSections() {
  return (tree: Root, file: VFile) => {
    // Le fichier d'exemple du gabarit et les fiches concept sont concernés ; le reste non.
    const chemin = file.path ?? ''
    if (!/[\\/](content[\\/]concepts|exemple)[\\/]/.test(chemin)) return

    const sortie: RootContent[] = []
    const vues: IdSectionRedigee[] = []
    let courante: MdxJsxFlowElement | null = null
    for (const n of tree.children) {
      if (n.type === 'yaml' || n.type === 'mdxjsEsm' || n.type === 'definition') {
        sortie.push(n)
        continue
      }
      if (n.type === 'heading' && n.depth === 2) {
        const titre = texteDe(n).trim()
        const id = sectionDepuisTitre(titre)
        if (!id) {
          file.fail(`Section inconnue « ${titre} ». Titres possibles : ${SECTIONS_REDIGEES.map((s) => s.titre).join(', ')}`, n)
        }
        if (vues.includes(id)) file.fail(`Section « ${titre} » en double`, n)
        const derniere = vues[vues.length - 1]
        if (derniere && rangSection(id) < rangSection(derniere)) file.fail(`Section « ${titre} » mal placée`, n)
        vues.push(id)
        courante = {
          type: 'mdxJsxFlowElement',
          name: 'Section',
          attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: id }],
          children: [],
        }
        sortie.push(courante)
        continue
      }
      if (!courante) file.fail('Du texte précède la première section : commence par « ## Intuition »', n)
      courante.children.push(n as MdxJsxFlowElement['children'][number])
    }
    tree.children = sortie
  }
}
