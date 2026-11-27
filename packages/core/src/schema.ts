import { z } from 'zod'

/** Identifiant d'URL : minuscules, chiffres et tirets, sans accent. */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug invalide : minuscules, chiffres et tirets seulement')

export const NIVEAUX = ['facile', 'moyen', 'difficile'] as const
export const LOGICIELS = ['gn', 'blender-shader', 'unreal-material', 'code'] as const
export const NATURES = ['fondamental', 'technique', 'recette'] as const
export const USAGES = [
  'materiaux',
  'terrain',
  'scatter',
  'vfx',
  'stylise',
  'hard-surface',
  'animation',
  'ui-technique',
] as const
export const STATUTS = ['brouillon', 'publie'] as const

/** Types de liens entre concepts, tels qu'affichés sur la carte et la page. */
export const TYPES_LIEN = ['prerequis', 'suite', 'cite', 'alternative'] as const

export const LIBELLES_LOGICIELS: Record<Logiciel, string> = {
  gn: 'Geometry Nodes',
  'blender-shader': 'Shader Editor (Blender)',
  'unreal-material': 'Material Editor (Unreal)',
  code: 'Code',
}

export type Niveau = (typeof NIVEAUX)[number]
export type Logiciel = (typeof LOGICIELS)[number]
export type Nature = (typeof NATURES)[number]
export type Usage = (typeof USAGES)[number]
export type Statut = (typeof STATUTS)[number]
export type TypeLien = (typeof TYPES_LIEN)[number]

/** Règles de rédaction exigées pour qu'un concept soit publié. */
export const REGLES_PUBLICATION = {
  descriptionMotsMin: 150,
  descriptionMotsMax: 300,
  questionsMin: 5,
  questionsMax: 10,
  synonymesMin: 1,
} as const

const texte = z.string().trim().min(1)
const listeSlugs = z.array(slugSchema).default([])

/** Un nom de module : composant React en PascalCase, ex. DotProductPlayground. */
export const nomModuleSchema = z
  .string()
  .regex(/^[A-Z][A-Za-z0-9]*$/, 'nom de module invalide : PascalCase attendu (ex. DotProductPlayground)')

/**
 * En-tête YAML d'une fiche concept (content/concepts/<domaine>/<slug>.mdx).
 * Un brouillon n'exige que l'identité du concept ; un concept publié exige
 * tous les champs de recherche et son module interactif.
 */
export const enTeteConceptBase = z
  .object({
    slug: slugSchema,
    titre: texte,
    statut: z.enum(STATUTS).default('brouillon'),
    domaine: slugSchema,
    chapitre: slugSchema,
    niveau: z.enum(NIVEAUX),
    logiciels: z.array(z.enum(LOGICIELS)).min(1, 'au moins un logiciel'),
    nodes: z.array(texte).default([]),
    usages: z.array(z.enum(USAGES)).default([]),
    nature: z.enum(NATURES).optional(),
    resume: texte.optional(),
    description: texte.optional(),
    questions: z.array(texte).default([]),
    synonymes: z.array(texte).default([]),
    effets: z.array(texte).default([]),
    prerequis: listeSlugs,
    suites: listeSlugs,
    alternatives: listeSlugs,
    module: nomModuleSchema.nullable().default(null),
    /** Idée de module tirée du catalogue, en attendant le vrai composant. */
    idee_module: texte.optional(),
    /** Position dans son chapitre (plus petit = plus tôt). */
    ordre: z.number().int().nonnegative().optional(),
    /** Temps de lecture et de manipulation estimé, en minutes. */
    temps: z.number().int().positive().max(120).optional(),
  })
  .strict()

export const compterMots = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

export const enTeteConceptSchema = enTeteConceptBase.superRefine((c, ctx) => {
  const auto = (champ: string, liste: string[]) => {
    if (liste.includes(c.slug)) {
      ctx.addIssue({ code: 'custom', path: [champ], message: `le concept se cite lui-même dans ${champ}` })
    }
    const doublons = liste.filter((s, i) => liste.indexOf(s) !== i)
    if (doublons.length) {
      ctx.addIssue({ code: 'custom', path: [champ], message: `doublons : ${[...new Set(doublons)].join(', ')}` })
    }
  }
  auto('prerequis', c.prerequis)
  auto('suites', c.suites)
  auto('alternatives', c.alternatives)

  if (c.statut !== 'publie') return
  const R = REGLES_PUBLICATION
  const manque = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
  if (!c.resume) manque('resume', 'obligatoire pour publier')
  if (!c.description) manque('description', 'obligatoire pour publier')
  else {
    const n = compterMots(c.description)
    if (n < R.descriptionMotsMin || n > R.descriptionMotsMax)
      manque('description', `${n} mots, il en faut entre ${R.descriptionMotsMin} et ${R.descriptionMotsMax}`)
  }
  if (c.questions.length < R.questionsMin || c.questions.length > R.questionsMax)
    manque('questions', `${c.questions.length} questions, il en faut entre ${R.questionsMin} et ${R.questionsMax}`)
  if (c.synonymes.length < R.synonymesMin) manque('synonymes', 'au moins un synonyme pour publier')
  if (!c.module) manque('module', 'un concept publié doit avoir son module interactif')
})

export type EnTeteConcept = z.output<typeof enTeteConceptSchema>

export const couleurSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'couleur hexadécimale #rrggbb attendue')

export const domaineSchema = z
  .object({
    slug: slugSchema,
    titre: texte,
    couleur: couleurSchema,
    description: texte.optional(),
  })
  .strict()

export const domainesFichierSchema = z.array(domaineSchema).min(1)

export const chapitreSchema = z
  .object({
    slug: slugSchema,
    titre: texte,
  })
  .strict()

/** content/chapitres.yaml : { <domaine>: [ { slug, titre }, … ] } dans l'ordre d'affichage. */
export const chapitresFichierSchema = z.record(slugSchema, z.array(chapitreSchema).min(1))

export const parcoursSchema = z
  .object({
    slug: slugSchema,
    titre: texte,
    description: texte.optional(),
    concepts: z.array(slugSchema).min(2),
  })
  .strict()

export type Domaine = z.output<typeof domaineSchema>
export type Chapitre = z.output<typeof chapitreSchema>
export type Parcours = z.output<typeof parcoursSchema>
