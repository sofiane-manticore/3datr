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
