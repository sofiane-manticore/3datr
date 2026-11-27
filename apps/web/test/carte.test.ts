import { describe, expect, it } from 'vitest'
import { cadrer, versCarte, versEcran, zoomerAutour } from '../src/carte/camera'
import { ancetres, indexerGraphe, rechercher } from '../src/carte/graphe'

const n = (slug: string, x = 0, y = 0) => ({ slug, titre: slug, domaine: 'd', chapitre: 'c', niveau: 'facile' as const, statut: 'brouillon' as const, poids: 0, x, y })

describe('caméra de la carte', () => {
  it('écran et carte sont inverses', () => {
    const c = { x: 10, y: -5, k: 1.7 }
    const e = versEcran(c, 800, 600, 42, 13)
    const p = versCarte(c, 800, 600, e.x, e.y)
    expect(p.x).toBeCloseTo(42)
    expect(p.y).toBeCloseTo(13)
  })
  it('le point sous le curseur reste fixe pendant le zoom', () => {
    const c = { x: 0, y: 0, k: 1 }
    const avant = versCarte(c, 800, 600, 100, 50)
    const z = zoomerAutour(c, 800, 600, 100, 50, 2)
    const apres = versCarte(z, 800, 600, 100, 50)
    expect(z.k).toBe(2)
    expect(apres.x).toBeCloseTo(avant.x)
    expect(apres.y).toBeCloseTo(avant.y)
  })
  it('cadre une boîte au centre', () => {
    const c = cadrer({ minX: -100, minY: -50, maxX: 100, maxY: 50 }, 440, 400, 20)
    expect(c).toMatchObject({ x: 0, y: 0, k: 2 })
  })
})

describe('graphe de la carte', () => {
  const g = indexerGraphe({
    domaines: [{ slug: 'd', titre: 'D', couleur: '#ffffff', x: 0, y: 0 }],
    noeuds: [n('a'), n('b'), n('c'), n('produit-scalaire')],
    liens: [
      { from: 'a', to: 'b', type: 'prerequis' },
      { from: 'b', to: 'c', type: 'prerequis' },
      { from: 'a', to: 'c', type: 'alternative' },
    ],
  })
  it('remonte tous les prérequis, directs et indirects', () => {
    expect([...ancetres(g, 'c')].sort()).toEqual(['a', 'b'])
    expect(ancetres(g, 'a').size).toBe(0)
  })
  it('cherche sans tenir compte des accents', () => {
    g.noeuds[3]!.titre = 'Produit scalaire (Dot Product)'
    expect(rechercher(g.noeuds, 'SCALAIRE').map((x) => x.slug)).toEqual(['produit-scalaire'])
    expect(rechercher(g.noeuds, 'prôduit').map((x) => x.slug)).toEqual(['produit-scalaire'])
  })
})

describe('disposition en carte mentale', () => {
  it('coupe un titre en lignes qui tiennent dans la largeur', async () => {
    const { couper } = await import('../src/carte/disposition')
    const mesure = (t: string) => t.length * 7
    const lignes = couper('Produit scalaire et projection sur un axe', 120, mesure)
    expect(lignes.every((l) => mesure(l) <= 120)).toBe(true)
    expect(lignes.join(' ')).toBe('Produit scalaire et projection sur un axe')
  })

  it('ne superpose aucune carte et rattache chaque concept à un seul parent', async () => {
    const { disposerCarte } = await import('../src/carte/disposition')
    const noeuds = Array.from({ length: 12 }, (_, i) => ({ ...n(`c${i}`), titre: `Concept numéro ${i} au titre assez long` }))
    const liens = noeuds.slice(1).map((x, i) => ({ from: `c${Math.floor(i / 2)}`, to: x.slug, type: 'prerequis' as const }))
    const d = disposerCarte(
      { domaines: [{ slug: 'd', titre: 'Domaine', couleur: '#ffffff', x: 0, y: 0 }], noeuds, liens },
      (t) => t.length * 7,
      'sans-serif',
    )
    expect(d.aretes).toHaveLength(12)
    const blocs = [...d.cartes.values(), ...d.titres.values()]
    for (let i = 0; i < blocs.length; i++)
      for (let j = i + 1; j < blocs.length; j++) {
        const a = blocs[i]!
        const b = blocs[j]!
        const recouvre = Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2
        expect(recouvre).toBe(false)
      }
  })
})
