/**
 * Les 9 sections d'une page concept, dans l'ordre d'affichage.
 *
 * Trois sont générées par le gabarit à partir de l'en-tête YAML et du catalogue
 * (en-tête, module, pour aller plus loin). Les six autres sont rédigées dans le
 * corps MDX, chacune sous un titre `## …` exact.
 *
 * Ce fichier ne dépend de rien : il est importé par le site sans embarquer Zod.
 */
export const SECTIONS_CONCEPT = [
  { id: 'en-tete', titre: 'En-tête', source: 'gabarit' },
  { id: 'intuition', titre: 'Intuition', source: 'mdx' },
  { id: 'module', titre: 'Module interactif', source: 'gabarit' },
  { id: 'formule', titre: 'La formule', source: 'mdx' },
  { id: 'logiciels', titre: 'Dans tes logiciels', source: 'mdx' },
  { id: 'recettes', titre: 'Recettes', source: 'mdx' },
  { id: 'pieges', titre: 'Pièges courants', source: 'mdx' },
  { id: 'plus-loin', titre: 'Pour aller plus loin', source: 'gabarit' },
  { id: 'defi', titre: 'Mini-défi', source: 'mdx' },
] as const

export type IdSection = (typeof SECTIONS_CONCEPT)[number]['id']
export type IdSectionRedigee = Extract<(typeof SECTIONS_CONCEPT)[number], { source: 'mdx' }>['id']

export const SECTIONS_REDIGEES = SECTIONS_CONCEPT.filter(
  (s): s is Extract<(typeof SECTIONS_CONCEPT)[number], { source: 'mdx' }> => s.source === 'mdx',
)

/** Minuscules, sans accents ni ponctuation superflue : « Pièges courants » → « pieges courants ». */
export const normaliserTitre = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const PAR_TITRE = new Map<string, IdSectionRedigee>(SECTIONS_REDIGEES.map((s) => [normaliserTitre(s.titre), s.id]))

/** Section rédigée correspondant à un titre `## …`, ou null s'il n'en est pas une. */
export function sectionDepuisTitre(titre: string): IdSectionRedigee | null {
  return PAR_TITRE.get(normaliserTitre(titre)) ?? null
}

export const rangSection = (id: IdSection) => SECTIONS_CONCEPT.findIndex((s) => s.id === id)

export interface ProblemeSections {
  ligne: number
  message: string
}

/**
 * Vérifie les titres `## …` d'un corps MDX : chacun doit être une section rédigée,
 * sans doublon, dans l'ordre du gabarit, et aucun texte ne doit précéder le premier.
 * Les blocs de code sont ignorés. Utilisé par la validation du contenu et par le plugin MDX.
 */
export function verifierSections(corps: string): { sections: IdSectionRedigee[]; problemes: ProblemeSections[] } {
  const sections: IdSectionRedigee[] = []
  const problemes: ProblemeSections[] = []
  const lignes = corps.split(/\r?\n/)
  let dansCode = false
  let texteAvant = false
  lignes.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) dansCode = !dansCode
    if (dansCode) return
    const m = l.match(/^##\s+(.+?)\s*#*\s*$/)
    if (!m) {
      if (!sections.length && l.trim() && !/^\s*(import|export)\s/.test(l)) texteAvant = true
      return
    }
    const id = sectionDepuisTitre(m[1])
    const ligne = i + 1
    if (!id) {
      const attendus = SECTIONS_REDIGEES.map((s) => s.titre).join(', ')
      problemes.push({ ligne, message: `section inconnue « ${m[1]} » (attendu : ${attendus})` })
      return
    }
    if (sections.includes(id)) problemes.push({ ligne, message: `section « ${m[1]} » en double` })
    else if (sections.length && rangSection(id) < rangSection(sections[sections.length - 1]))
      problemes.push({ ligne, message: `section « ${m[1]} » mal placée : l'ordre est ${SECTIONS_REDIGEES.map((s) => s.titre).join(' > ')}` })
    sections.push(id)
  })
  if (texteAvant) problemes.unshift({ ligne: 1, message: 'du texte précède la première section : commence par « ## Intuition »' })
  return { sections, problemes }
}

/** Libellés des onglets « Dans tes logiciels » et des badges, dans l'ordre d'affichage. */
export const ONGLETS_LOGICIELS = [
  { id: 'gn', court: 'GN', long: 'Geometry Nodes' },
  { id: 'blender-shader', court: 'Shader Editor', long: 'Shader Editor (Blender)' },
  { id: 'unreal-material', court: 'Unreal', long: 'Material Editor (Unreal)' },
  { id: 'code', court: 'Code', long: 'Code' },
] as const

export const LIBELLES_NIVEAUX = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' } as const
export const RANG_NIVEAU = { facile: 1, moyen: 2, difficile: 3 } as const
