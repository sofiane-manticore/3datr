import { describe, expect, it } from 'vitest'
import { compile } from '@mdx-js/mdx'
import { VFile } from 'vfile'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { remarkSections } from '../src/mdx/remark-sections'
import { remarkLiensConcepts } from '../src/mdx/remark-liens'
import { OPTIONS_KATEX } from '../src/mdx/katex'

const compiler = async (source: string) =>
  String(
    await compile(new VFile({ path: '/repo/content/concepts/vecteurs/test.mdx', value: source }), {
      remarkPlugins: [remarkFrontmatter, remarkMath, remarkLiensConcepts, remarkSections],
      rehypePlugins: [[rehypeKatex, OPTIONS_KATEX]],
      jsx: true,
    }),
  )

describe('plugins MDX du gabarit', () => {
  it('découpe le corps en sections nommées', async () => {
    const js = await compiler('---\nslug: test\n---\n\n## Intuition\n\nUne phrase.\n\n## Pièges courants\n\nUn piège.\n')
    expect(js).toContain('<Section id="intuition">')
    expect(js).toContain('<Section id="pieges">')
    expect(js).not.toContain('slug: test')
  })

  it('refuse une section inconnue, en double ou mal placée', async () => {
    await expect(compiler('## Intuition\n\na\n\n## Bonus\n\nb\n')).rejects.toThrow(/Section inconnue « Bonus »/)
    await expect(compiler('## Intuition\n\na\n\n## Intuition\n\nb\n')).rejects.toThrow(/en double/)
    await expect(compiler('## Recettes\n\na\n\n## La formule\n\nb\n')).rejects.toThrow(/mal placée/)
    await expect(compiler('Texte orphelin.\n\n## Intuition\n\na\n')).rejects.toThrow(/précède la première section/)
  })

  it('transforme [[slug]] et [[slug|texte]] en liens de concept, sauf dans le code', async () => {
    const js = await compiler('## Intuition\n\nVoir [[normalisation]] et [[lerp|le mélange]], pas `[[code]]`.\n')
    expect(js).toContain('<LienConcept slug="normalisation" />')
    expect(js).toContain('<LienConcept slug="lerp" texte="le mélange" />')
    expect(js).toContain('[[code]]')
  })

  it('colore les variables des formules avec des classes', async () => {
    const js = await compiler('## La formule\n\n$$\\col{rouge}{a} \\cdot \\col{bleu}{b}$$\n')
    expect(js).toContain('v-rouge')
    expect(js).toContain('v-bleu')
  })
})
