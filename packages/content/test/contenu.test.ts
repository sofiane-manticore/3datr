import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { compilerContenu } from '../src/compiler.js'
import { chargerContenu, type ContenuBrut, type FichierConcept } from '../src/charger.js'
import { validerContenu } from '../src/valider.js'
import { extraireCitations, trouverCycles } from '@3datr/core'

const domaines = [{ slug: 'vecteurs', titre: 'Vecteurs', couleur: '#e5484d' }]
const chapitres = { vecteurs: [{ slug: 'bases', titre: 'Bases' }] }

function concept(slug: string, extra: Record<string, unknown> = {}, corps = ''): FichierConcept {
  return {
    fichier: `concepts/vecteurs/${slug}.mdx`,
    dossier: 'vecteurs',
    nom: slug,
    hash: slug,
    corps,
    enTete: { slug, titre: slug, domaine: 'vecteurs', chapitre: 'bases', niveau: 'facile', logiciels: ['gn'], ...extra },
  }
}

const brut = (concepts: FichierConcept[], parcours: ContenuBrut['parcours'] = []): ContenuBrut => ({
  racine: '/',
  domaines,
  chapitres,
  parcours,
  concepts,
  erreurs: [],
})

const messages = (r: { erreurs: { message: string }[] }) => r.erreurs.map((e) => e.message)

describe('validation', () => {
  it('accepte un brouillon minimal relié', () => {
    const r = validerContenu(brut([concept('a'), concept('b', { prerequis: ['a'] })]))
    expect(r.erreurs).toEqual([])
    expect(r.avertissements).toEqual([])
  })

  it('refuse un slug cité qui n’existe pas', () => {
    const r = validerContenu(brut([concept('a', { prerequis: ['fantome'] }, 'voir [[autre-fantome]]')]))
    expect(messages(r)).toContain('prerequis : concept inexistant « fantome »')
    expect(messages(r)).toContain('lien [[…]] dans le texte : concept inexistant « autre-fantome »')
  })

  it('détecte une boucle de prérequis, y compris via les suites', () => {
    const r = validerContenu(
      brut([concept('a', { prerequis: ['c'] }), concept('b', { prerequis: ['a'] }), concept('c', { prerequis: ['b'] })]),
    )
    expect(messages(r).some((m) => m.startsWith('boucle de prérequis'))).toBe(true)
    const r2 = validerContenu(brut([concept('a', { suites: ['b'] }), concept('b', { suites: ['a'] })]))
    expect(messages(r2).some((m) => m.startsWith('boucle de prérequis'))).toBe(true)
  })

  it('exige que le module déclaré soit enregistré', () => {
    const c = [concept('a', { module: 'Absent' }), concept('b', { module: 'Present', prerequis: ['a'] })]
    const r = validerContenu(brut(c), { moduleExiste: (n) => n === 'Present' })
    expect(messages(r)).toEqual(['module « Absent » introuvable dans le registre des modules'])
  })

  it('exige les champs de recherche et le module pour publier', () => {
    const r = validerContenu(brut([concept('a', { statut: 'publie' })]))
    const m = messages(r).join('\n')
    for (const champ of ['resume', 'description', 'questions', 'synonymes', 'module']) expect(m).toContain(champ)
  })

  it('compte les mots de la description publiée', () => {
    const description = Array.from({ length: 160 }, (_, i) => `mot${i}`).join(' ')
    const ok = concept('a', {
      statut: 'publie',
      resume: 'Une phrase.',
      description,
      questions: ['q1', 'q2', 'q3', 'q4', 'q5'],
      synonymes: ['s'],
      module: 'M',
    })
    expect(validerContenu(brut([ok]), { moduleExiste: () => true }).erreurs).toEqual([])
  })

  it('vérifie le rangement du fichier', () => {
    const f = { ...concept('a'), nom: 'b', dossier: 'autre' }
    const m = messages(validerContenu(brut([f])))
    expect(m.some((x) => x.includes('nom du fichier'))).toBe(true)
    expect(m.some((x) => x.includes('concepts/vecteurs/'))).toBe(true)
  })

  it('refuse les champs inconnus et les auto-références', () => {
    const m = messages(validerContenu(brut([concept('a', { inconnu: 1, prerequis: ['a'] })])))
    expect(m.some((x) => x.includes('inconnu'))).toBe(true)
  })
})

describe('liens', () => {
  it('extrait les [[slug]] hors du code', () => {
    expect(extraireCitations('voir [[lerp]] et [[map-range|Map Range]], pas `[[faux]]`\n```\n[[faux2]]\n```')).toEqual([
      'lerp',
      'map-range',
    ])
  })

  it('trouve les cycles', () => {
    expect(trouverCycles(new Map([['a', ['b']], ['b', ['a']]]))).toEqual([['a', 'b', 'a']])
    expect(trouverCycles(new Map([['a', ['b']], ['b', []]]))).toEqual([])
  })
})

describe('compilation', () => {
  it('produit des liens typés dédoublonnés et les rétroliens', () => {
    const r = validerContenu(
      brut([concept('a'), concept('b', { prerequis: ['a'], alternatives: ['c'] }, 'comme [[a]]'), concept('c', { alternatives: ['b'] })]),
    )
    const { catalogue, graphe } = compilerContenu(r.contenu)
    expect(graphe.liens).toEqual([
      { from: 'a', to: 'b', type: 'prerequis' },
      { from: 'b', to: 'c', type: 'alternative' },
    ])
    const a = catalogue.concepts.find((c) => c.slug === 'a')!
    expect(a.requisPar).toEqual(['b'])
    expect(a.citePar).toEqual(['b'])
    expect(catalogue.concepts.find((c) => c.slug === 'c')!.alternativesTous).toEqual(['b'])
    expect(graphe.noeuds.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true)
  })

  it('est déterministe', () => {
    const r = validerContenu(brut([concept('a'), concept('b', { prerequis: ['a'] })]))
    expect(JSON.stringify(compilerContenu(r.contenu))).toBe(JSON.stringify(compilerContenu(r.contenu)))
  })
})

describe('contenu du dépôt', () => {
  it('est valide', () => {
    const racine = fileURLToPath(new URL('../../../content', import.meta.url))
    const r = validerContenu(chargerContenu(racine), { moduleExiste: () => true })
    expect(r.erreurs).toEqual([])
    expect(r.contenu.concepts.length).toBeGreaterThanOrEqual(192)
  })
})
