import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  chapitresFichierSchema,
  domainesFichierSchema,
  enTeteConceptSchema,
  extraireCitations,
  parcoursSchema,
  trouverCycles,
  verifierSections,
  type Chapitre,
  type Domaine,
  type EnTeteConcept,
  type Parcours,
} from '@3datr/core'
import type { ContenuBrut } from './charger.js'

export interface Probleme {
  fichier: string
  message: string
}

export interface ConceptValide extends EnTeteConcept {
  fichier: string
  hash: string
  corps: string
  cites: string[]
}

export interface ContenuValide {
  domaines: Domaine[]
  chapitres: Record<string, Chapitre[]>
  parcours: Parcours[]
  concepts: ConceptValide[]
}

export interface ResultatValidation {
  erreurs: Probleme[]
  avertissements: Probleme[]
  contenu: ContenuValide
}

export interface OptionsValidation {
  /** Dit si un module interactif est enregistré. Par défaut : toujours faux. */
  moduleExiste?: (nom: string) => boolean
}

/** Un module est enregistré s'il existe <dossier>/<Nom>.tsx ou <dossier>/<Nom>/index.tsx. */
export function registreModulesDossier(dossier: string) {
  return (nom: string) =>
    existsSync(join(dossier, `${nom}.tsx`)) || existsSync(join(dossier, nom, 'index.tsx'))
}

const formaterZod = (e: { issues: { path: PropertyKey[]; message: string }[] }) =>
  e.issues.map((i) => `${i.path.length ? i.path.map(String).join('.') + ' : ' : ''}${i.message}`)

export function validerContenu(brut: ContenuBrut, options: OptionsValidation = {}): ResultatValidation {
  const moduleExiste = options.moduleExiste ?? (() => false)
  const erreurs: Probleme[] = [...brut.erreurs]
  const avertissements: Probleme[] = []
  const err = (fichier: string, message: string) => erreurs.push({ fichier, message })
  const avert = (fichier: string, message: string) => avertissements.push({ fichier, message })

  // Domaines
  let domaines: Domaine[] = []
  if (brut.domaines !== undefined) {
    const r = domainesFichierSchema.safeParse(brut.domaines)
    if (r.success) domaines = r.data
    else formaterZod(r.error).forEach((m) => err('domaines.yaml', m))
  }
  const slugsDomaines = new Set<string>()
  for (const d of domaines) {
    if (slugsDomaines.has(d.slug)) err('domaines.yaml', `domaine en double : ${d.slug}`)
    slugsDomaines.add(d.slug)
  }

  // Chapitres
  let chapitres: Record<string, Chapitre[]> = {}
  if (brut.chapitres !== undefined) {
    const r = chapitresFichierSchema.safeParse(brut.chapitres)
    if (r.success) chapitres = r.data
    else formaterZod(r.error).forEach((m) => err('chapitres.yaml', m))
  }
  const chapitreVersDomaine = new Map<string, string>()
  for (const [dom, liste] of Object.entries(chapitres)) {
    if (!slugsDomaines.has(dom)) err('chapitres.yaml', `domaine inconnu : ${dom}`)
    for (const c of liste) {
      if (chapitreVersDomaine.has(c.slug)) err('chapitres.yaml', `chapitre en double : ${c.slug}`)
      chapitreVersDomaine.set(c.slug, dom)
    }
  }
  for (const d of domaines) if (!chapitres[d.slug]) err('chapitres.yaml', `le domaine ${d.slug} n'a aucun chapitre`)

  // Concepts : schéma et cohérence avec le fichier
  const concepts: ConceptValide[] = []
  const parSlug = new Map<string, ConceptValide>()
  for (const f of brut.concepts) {
    if (f.erreur) {
      err(f.fichier, f.erreur)
      continue
    }
    const r = enTeteConceptSchema.safeParse(f.enTete)
    if (!r.success) {
      formaterZod(r.error).forEach((m) => err(f.fichier, m))
      continue
    }
    const c = r.data
    if (c.slug !== f.nom) err(f.fichier, `le slug « ${c.slug} » doit être le nom du fichier (« ${f.nom} »)`)
    if (c.domaine !== f.dossier) err(f.fichier, `le fichier doit être rangé dans concepts/${c.domaine}/`)
    if (!slugsDomaines.has(c.domaine)) err(f.fichier, `domaine inconnu : ${c.domaine}`)
    const domChap = chapitreVersDomaine.get(c.chapitre)
    if (!domChap) err(f.fichier, `chapitre inconnu : ${c.chapitre}`)
    else if (domChap !== c.domaine)
      err(f.fichier, `le chapitre ${c.chapitre} appartient au domaine ${domChap}, pas à ${c.domaine}`)
    if (c.module && !moduleExiste(c.module))
      err(f.fichier, `module « ${c.module} » introuvable dans le registre des modules`)
    if (parSlug.has(c.slug)) {
      err(f.fichier, `slug déjà utilisé par ${parSlug.get(c.slug)!.fichier}`)
      continue
    }
    for (const p of verifierSections(f.corps).problemes) err(f.fichier, `ligne ${p.ligne} du texte : ${p.message}`)
    const cv: ConceptValide = { ...c, fichier: f.fichier, hash: f.hash, corps: f.corps, cites: extraireCitations(f.corps) }
    concepts.push(cv)
    parSlug.set(c.slug, cv)
  }

  // Slugs cités : doivent exister
  for (const c of concepts) {
    const verifier = (champ: string, liste: string[]) => {
      for (const s of liste) if (!parSlug.has(s)) err(c.fichier, `${champ} : concept inexistant « ${s} »`)
    }
    verifier('prerequis', c.prerequis)
    verifier('suites', c.suites)
    verifier('alternatives', c.alternatives)
    verifier('lien [[…]] dans le texte', c.cites)
    if (c.cites.includes(c.slug)) avert(c.fichier, 'le texte contient un lien vers lui-même')
  }

  // Parcours
  const parcours: Parcours[] = []
  for (const p of brut.parcours) {
    if (p.erreur) {
      err(p.fichier, p.erreur)
      continue
    }
    const r = parcoursSchema.safeParse(p.donnees)
    if (!r.success) {
      formaterZod(r.error).forEach((m) => err(p.fichier, m))
      continue
    }
    if (`parcours/${r.data.slug}.yaml` !== p.fichier) err(p.fichier, `le slug « ${r.data.slug} » doit être le nom du fichier`)
    for (const s of r.data.concepts) if (!parSlug.has(s)) err(p.fichier, `concept inexistant « ${s} »`)
    r.data.concepts.forEach((s, i) => {
      for (const pre of parSlug.get(s)?.prerequis ?? []) {
        const j = r.data.concepts.indexOf(pre)
        if (j > i) avert(p.fichier, `${s} arrive avant son prérequis ${pre}`)
      }
    })
    parcours.push(r.data)
  }

  // Ordre d'apprentissage : prérequis (p → c) et suites (c → s) ne doivent pas boucler
  const ordre = new Map<string, string[]>()
  const ajouter = (a: string, b: string) => {
    if (!parSlug.has(a) || !parSlug.has(b)) return
    ordre.set(a, [...(ordre.get(a) ?? []), b])
  }
  for (const c of concepts) {
    ordre.set(c.slug, ordre.get(c.slug) ?? [])
    c.prerequis.forEach((p) => ajouter(p, c.slug))
    c.suites.forEach((s) => ajouter(c.slug, s))
  }
  for (const cycle of trouverCycles(ordre)) {
    const fichier = parSlug.get(cycle[0])?.fichier ?? 'concepts'
    err(fichier, `boucle de prérequis : ${cycle.join(' → ')}`)
  }

  // Avertissements : concepts sans aucun lien
  const relies = new Set<string>()
  for (const c of concepts) {
    for (const s of [...c.prerequis, ...c.suites, ...c.alternatives, ...c.cites]) {
      relies.add(s)
      relies.add(c.slug)
    }
  }
  for (const c of concepts) if (!relies.has(c.slug)) avert(c.fichier, "concept isolé : aucun lien vers ou depuis d'autres concepts")

  // Avertissements : chapitres vides
  const chapitresUtilises = new Set(concepts.map((c) => c.chapitre))
  for (const [dom, liste] of Object.entries(chapitres))
    for (const ch of liste) if (!chapitresUtilises.has(ch.slug)) avert('chapitres.yaml', `chapitre vide : ${dom}/${ch.slug}`)

  return { erreurs, avertissements, contenu: { domaines, chapitres, parcours, concepts } }
}
