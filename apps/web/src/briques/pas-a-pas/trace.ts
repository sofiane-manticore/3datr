/**
 * Trace d'exécution : la liste des étapes (ligne active + variables) d'un petit programme.
 * On écrit en JavaScript un générateur qui suit le code affiché et qui « yield » à chaque ligne :
 *
 *   tracer(function* () {
 *     let somme = 0;                    yield [1, { somme }]
 *     for (let i = 0; i < 3; i++) {     yield [2, { somme, i }]
 *       somme += i;                     yield [3, { somme, i }, 'on ajoute i']
 *     }
 *   })
 */
export type Valeur = number | string | boolean | null | Valeur[] | { [k: string]: Valeur }
export interface Etape {
  /** Ligne du code affiché, à partir de 1. */
  ligne: number
  variables: Record<string, Valeur>
  note?: string
  /** Lignes affichées dans la sortie (print) jusqu'ici. */
  sortie: string[]
}

export type Pas = [ligne: number, variables: Record<string, Valeur>, note?: string]

export function tracer(programme: (print: (...x: unknown[]) => void) => Generator<Pas, void, unknown>, max = 2000): Etape[] {
  const sortie: string[] = []
  const etapes: Etape[] = []
  const print = (...x: unknown[]) => sortie.push(x.map(String).join(' '))
  for (const [ligne, variables, note] of programme(print)) {
    etapes.push({ ligne, variables: structuredClone(variables), note, sortie: [...sortie] })
    if (etapes.length >= max) break
  }
  return etapes
}

/** Noms des variables qui ont changé (ou sont apparues) depuis l'étape précédente. */
export function changees(avant: Etape | undefined, apres: Etape): Set<string> {
  const s = new Set<string>()
  for (const [k, v] of Object.entries(apres.variables)) if (!avant || JSON.stringify(avant.variables[k]) !== JSON.stringify(v)) s.add(k)
  return s
}
