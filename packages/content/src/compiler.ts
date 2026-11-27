import { createHash } from 'node:crypto'
import { VERSION_FORMAT, type Catalogue, type ConceptCompile, type Graphe, type Lien } from '@3datr/core'
import { disposer } from './disposition.js'
import type { ContenuValide } from './valider.js'

const cle = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** Liens typés dédoublonnés : un seul lien par paire, le plus fort l'emporte. */
export function construireLiens(contenu: ContenuValide): Lien[] {
  const liens: Lien[] = []
  const paires = new Set<string>()
  const pousser = (l: Lien) => {
    const k = cle(l.from, l.to)
    if (l.from === l.to || paires.has(k)) return
    paires.add(k)
    liens.push(l)
  }
  const tries = [...contenu.concepts].sort((a, b) => a.slug.localeCompare(b.slug))
  for (const c of tries) for (const p of c.prerequis) pousser({ from: p, to: c.slug, type: 'prerequis' })
  for (const c of tries) for (const s of c.suites) pousser({ from: c.slug, to: s, type: 'suite' })
  for (const c of tries) for (const a of c.alternatives) pousser({ from: c.slug, to: a, type: 'alternative' })
  for (const c of tries) for (const s of c.cites) pousser({ from: c.slug, to: s, type: 'cite' })
  return liens
}

export function compilerContenu(contenu: ContenuValide): { catalogue: Catalogue; graphe: Graphe } {
  const requisPar = new Map<string, string[]>()
  const citePar = new Map<string, string[]>()
  const alternatives = new Map<string, Set<string>>()
  const push = (m: Map<string, string[]>, k: string, v: string) => m.set(k, [...(m.get(k) ?? []), v])
  for (const c of contenu.concepts) {
    c.prerequis.forEach((p) => push(requisPar, p, c.slug))
    c.cites.forEach((s) => push(citePar, s, c.slug))
    for (const a of c.alternatives) {
      if (!alternatives.has(c.slug)) alternatives.set(c.slug, new Set())
      if (!alternatives.has(a)) alternatives.set(a, new Set())
      alternatives.get(c.slug)!.add(a)
      alternatives.get(a)!.add(c.slug)
    }
  }

  const ordreDomaine = new Map(contenu.domaines.map((d, i) => [d.slug, i]))
  const ordreChapitre = new Map<string, number>()
  for (const liste of Object.values(contenu.chapitres)) liste.forEach((c, i) => ordreChapitre.set(c.slug, i))

  const concepts: ConceptCompile[] = contenu.concepts
    .map(({ corps: _corps, ...c }) => ({
      ...c,
      citePar: [...(citePar.get(c.slug) ?? [])].sort(),
      requisPar: [...(requisPar.get(c.slug) ?? [])].sort(),
      alternativesTous: [...(alternatives.get(c.slug) ?? [])].sort(),
    }))
    .sort(
      (a, b) =>
        (ordreDomaine.get(a.domaine) ?? 99) - (ordreDomaine.get(b.domaine) ?? 99) ||
        (ordreChapitre.get(a.chapitre) ?? 99) - (ordreChapitre.get(b.chapitre) ?? 99) ||
        (a.ordre ?? Number.MAX_SAFE_INTEGER) - (b.ordre ?? Number.MAX_SAFE_INTEGER) ||
        a.slug.localeCompare(b.slug),
    )

  const hash = createHash('sha1')
    .update(JSON.stringify([contenu.domaines, contenu.chapitres, contenu.parcours]))
    .update(concepts.map((c) => c.hash).join(','))
    .digest('hex')
    .slice(0, 12)

  const domaines: Catalogue['domaines'] = contenu.domaines.map((d, ordre) => ({
    ...d,
    ordre,
    chapitres: (contenu.chapitres[d.slug] ?? []).map((ch) => ({
      ...ch,
      concepts: concepts.filter((c) => c.chapitre === ch.slug).map((c) => c.slug),
    })),
  }))

  const liens = construireLiens(contenu)
  const { centres, positions } = disposer(
    contenu.domaines.map((d) => d.slug),
    concepts.map((c) => ({ slug: c.slug, domaine: c.domaine, poids: c.requisPar.length })),
    liens.filter((l) => l.type !== 'cite'),
  )

  const graphe: Graphe = {
    version: VERSION_FORMAT,
    hash,
    domaines: contenu.domaines.map((d) => ({
      slug: d.slug,
      titre: d.titre,
      couleur: d.couleur,
      ...(centres.get(d.slug) ?? { x: 0, y: 0 }),
    })),
    noeuds: concepts.map((c) => ({
      slug: c.slug,
      titre: c.titre,
      domaine: c.domaine,
      chapitre: c.chapitre,
      niveau: c.niveau,
      statut: c.statut,
      poids: c.requisPar.length,
      ...positions.get(c.slug)!,
    })),
    liens,
  }

  return { catalogue: { version: VERSION_FORMAT, hash, domaines, parcours: contenu.parcours, concepts }, graphe }
}
