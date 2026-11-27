import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { parse as parseYaml } from 'yaml'

export interface FichierConcept {
  /** Chemin relatif à content/, avec des / */
  fichier: string
  /** Nom du dossier parent (doit être le domaine) */
  dossier: string
  /** Nom du fichier sans extension (doit être le slug) */
  nom: string
  enTete: unknown
  corps: string
  hash: string
  erreur?: string
}

export interface ContenuBrut {
  racine: string
  domaines: unknown
  chapitres: unknown
  parcours: { fichier: string; donnees: unknown; erreur?: string }[]
  concepts: FichierConcept[]
  erreurs: { fichier: string; message: string }[]
}

const REGEX_EN_TETE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export function separerEnTete(source: string): { yaml: string; corps: string } | null {
  const m = source.match(REGEX_EN_TETE)
  if (!m) return null
  return { yaml: m[1], corps: source.slice(m[0].length) }
}

const versPosix = (p: string) => p.split(sep).join('/')

function lireYaml(racine: string, nom: string, erreurs: ContenuBrut['erreurs']): unknown {
  const chemin = join(racine, nom)
  if (!existsSync(chemin)) {
    erreurs.push({ fichier: nom, message: 'fichier manquant' })
    return undefined
  }
  try {
    return parseYaml(readFileSync(chemin, 'utf8'))
  } catch (e) {
    erreurs.push({ fichier: nom, message: `YAML illisible : ${(e as Error).message}` })
    return undefined
  }
}

export function chargerContenu(racine: string): ContenuBrut {
  const erreurs: ContenuBrut['erreurs'] = []
  const domaines = lireYaml(racine, 'domaines.yaml', erreurs)
  const chapitres = lireYaml(racine, 'chapitres.yaml', erreurs)

  const parcours: ContenuBrut['parcours'] = []
  const dossierParcours = join(racine, 'parcours')
  if (existsSync(dossierParcours)) {
    for (const f of readdirSync(dossierParcours).filter((f) => f.endsWith('.yaml')).sort()) {
      const fichier = `parcours/${f}`
      try {
        parcours.push({ fichier, donnees: parseYaml(readFileSync(join(dossierParcours, f), 'utf8')) })
      } catch (e) {
        parcours.push({ fichier, donnees: undefined, erreur: `YAML illisible : ${(e as Error).message}` })
      }
    }
  }

  const concepts: FichierConcept[] = []
  const dossierConcepts = join(racine, 'concepts')
  if (existsSync(dossierConcepts)) {
    const fichiers = readdirSync(dossierConcepts, { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.mdx'))
      .map(versPosix)
      .sort()
    for (const f of fichiers) {
      const source = readFileSync(join(dossierConcepts, f), 'utf8')
      const morceaux = f.split('/')
      const fichier = versPosix(relative(racine, join(dossierConcepts, f)))
      const base: Omit<FichierConcept, 'enTete' | 'corps'> = {
        fichier,
        dossier: morceaux.length > 1 ? morceaux[morceaux.length - 2] : '',
        nom: morceaux[morceaux.length - 1].replace(/\.mdx$/, ''),
        hash: createHash('sha1').update(source).digest('hex').slice(0, 12),
      }
      const parties = separerEnTete(source)
      if (!parties) {
        concepts.push({ ...base, enTete: undefined, corps: source, erreur: "pas d'en-tête YAML entre deux lignes ---" })
        continue
      }
      try {
        concepts.push({ ...base, enTete: parseYaml(parties.yaml), corps: parties.corps })
      } catch (e) {
        concepts.push({ ...base, enTete: undefined, corps: parties.corps, erreur: `YAML illisible : ${(e as Error).message}` })
      }
    }
  }

  return { racine, domaines, chapitres, parcours, concepts, erreurs }
}
