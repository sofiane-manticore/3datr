/**
 * Syntaxe de lien dans le texte MDX : [[slug]] ou [[slug|texte affiché]].
 * Partagé entre le compilateur de contenu et le rendu des pages.
 */
export const REGEX_LIEN_CONCEPT = /\[\[([a-z0-9]+(?:-[a-z0-9]+)*)(?:\|([^\]\n]+))?\]\]/g

/** Retire les blocs de code (``` et `inline`) pour ne pas y chercher de liens. */
export function sansCode(corps: string): string {
  return corps.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
}

/** Slugs cités dans un corps MDX, dans l'ordre de première apparition, sans doublon. */
export function extraireCitations(corps: string): string[] {
  const vus = new Set<string>()
  for (const m of sansCode(corps).matchAll(REGEX_LIEN_CONCEPT)) vus.add(m[1])
  return [...vus]
}

/**
 * Cherche les cycles d'un graphe orienté (arêtes de → vers).
 * Renvoie chaque cycle trouvé sous forme de chemin [a, b, …, a].
 */
export function trouverCycles(aretes: Map<string, string[]>): string[][] {
  const BLANC = 0
  const GRIS = 1
  const NOIR = 2
  const etat = new Map<string, number>()
  const pile: string[] = []
  const cycles: string[][] = []

  const visiter = (n: string) => {
    etat.set(n, GRIS)
    pile.push(n)
    for (const v of aretes.get(n) ?? []) {
      const e = etat.get(v) ?? BLANC
      if (e === GRIS) cycles.push([...pile.slice(pile.indexOf(v)), v])
      else if (e === BLANC) visiter(v)
    }
    pile.pop()
    etat.set(n, NOIR)
  }

  for (const n of [...aretes.keys()].sort()) if ((etat.get(n) ?? BLANC) === BLANC) visiter(n)
  return cycles
}
