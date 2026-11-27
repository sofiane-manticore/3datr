/**
 * Schéma statique d'un node tree minimal, façon Blender ou Unreal, rendu en SVG
 * (identique au pré-rendu et dans le navigateur, aucune mesure du DOM).
 *
 * <NodeTree
 *   nodes={[
 *     { id: 'n', titre: 'Normal', categorie: 'entree', sorties: ['Normal:vecteur'] },
 *     { id: 'dot', titre: 'Dot Product', categorie: 'vecteur', col: 1,
 *       entrees: ['A:vecteur', 'B:vecteur'], sorties: ['Valeur:float'] },
 *   ]}
 *   liens={['n.Normal > dot.A']}
 * />
 *
 * Un socket s'écrit « Nom » ou « Nom:type » (float, vecteur, couleur, shader,
 * geometrie, entier, booleen, rotation, texte). Un lien s'écrit « node.Socket > node.Socket ».
 * `col` place le node dans une colonne (par défaut, une colonne par node).
 */

const COULEURS_SOCKETS: Record<string, string> = {
  float: '#a1a1a1',
  vecteur: '#6363c7',
  couleur: '#c7c729',
  shader: '#63c763',
  geometrie: '#00d6a3',
  entier: '#598c5c',
  booleen: '#cca6d6',
  rotation: '#a663c7',
  texte: '#6c8cbf',
}

const COULEURS_CATEGORIES: Record<string, string> = {
  entree: '#83314a',
  vecteur: '#3c3c83',
  math: '#246283',
  convertisseur: '#246283',
  couleur: '#6b6b1f',
  texture: '#79461d',
  shader: '#2b652b',
  geometrie: '#1d725e',
  sortie: '#4c1d1d',
}

export interface NoeudSchema {
  id: string
  titre: string
  categorie?: keyof typeof COULEURS_CATEGORIES
  col?: number
  entrees?: string[]
  sorties?: string[]
}

const L = 156 // largeur d'un node
const ENTETE = 24
const RANG = 22
const MARGE_BAS = 8
const ECART_COL = 64
const ECART_LIGNE = 22
const BORD = 12

const lireSocket = (s: string) => {
  const [nom, type = 'float'] = s.split(':').map((x) => x.trim())
  return { nom, type }
}

export function NodeTree({ nodes, liens = [], legende }: { nodes: NoeudSchema[]; liens?: string[]; legende?: string }) {
  const positions = new Map<string, { x: number; y: number; h: number; n: NoeudSchema }>()
  const hauteurCol = new Map<number, number>()
  nodes.forEach((n, i) => {
    const col = n.col ?? i
    const h = ENTETE + ((n.sorties?.length ?? 0) + (n.entrees?.length ?? 0)) * RANG + MARGE_BAS
    const y = hauteurCol.get(col) ?? 0
    positions.set(n.id, { x: BORD + col * (L + ECART_COL), y: BORD + y, h, n })
    hauteurCol.set(col, y + h + ECART_LIGNE)
  })
  const largeur = Math.max(...[...positions.values()].map((p) => p.x + L)) + BORD
  const hauteur = Math.max(...[...hauteurCol.values()]) - ECART_LIGNE + BORD * 2

  /** Position d'un socket : sorties en haut à droite, entrées dessous à gauche (comme Blender). */
  const socket = (ref: string, cote: 'sortie' | 'entree') => {
    const [id, nom] = ref.split('.').map((x) => x.trim())
    const p = positions.get(id)
    if (!p) return null
    const sorties = (p.n.sorties ?? []).map(lireSocket)
    const entrees = (p.n.entrees ?? []).map(lireSocket)
    if (cote === 'sortie') {
      const i = sorties.findIndex((s) => s.nom === nom)
      if (i < 0) return null
      return { x: p.x + L, y: p.y + ENTETE + i * RANG + RANG / 2, type: sorties[i].type }
    }
    const i = entrees.findIndex((s) => s.nom === nom)
    if (i < 0) return null
    return { x: p.x, y: p.y + ENTETE + (sorties.length + i) * RANG + RANG / 2, type: entrees[i].type }
  }

  return (
    <figure className="not-prose my-2">
      <div className="fond-grille overflow-x-auto rounded-xl border border-bord">
        <svg
          viewBox={`0 0 ${largeur} ${hauteur}`}
          width={largeur}
          height={hauteur}
          className="mx-auto block max-w-none"
          role="img"
          aria-label={legende ?? `Node tree : ${nodes.map((n) => n.titre).join(', ')}`}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {liens.map((l) => {
            const [de, vers] = l.split('>').map((x) => x.trim())
            const a = socket(de, 'sortie')
            const b = socket(vers, 'entree')
            if (!a || !b) return null
            const dx = Math.max(40, Math.abs(b.x - a.x) / 2)
            return (
              <path
                key={l}
                d={`M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`}
                fill="none"
                stroke={COULEURS_SOCKETS[a.type] ?? COULEURS_SOCKETS.float}
                strokeWidth={2.2}
              />
            )
          })}
          {[...positions.values()].map(({ x, y, h, n }) => {
            const sorties = (n.sorties ?? []).map(lireSocket)
            const entrees = (n.entrees ?? []).map(lireSocket)
            return (
              <g key={n.id}>
                <rect x={x} y={y} width={L} height={h} rx={6} fill="var(--surface-2)" stroke="var(--bord)" />
                <path
                  d={`M${x},${y + ENTETE} V${y + 6} a6,6 0 0 1 6,-6 H${x + L - 6} a6,6 0 0 1 6,6 V${y + ENTETE} Z`}
                  fill={COULEURS_CATEGORIES[n.categorie ?? 'math'] ?? COULEURS_CATEGORIES.math}
                />
                <text x={x + 10} y={y + 16} fontSize={12} fontWeight={600} fill="#f2f2f2">
                  {n.titre}
                </text>
                {sorties.map((s, i) => {
                  const cy = y + ENTETE + i * RANG + RANG / 2
                  return (
                    <g key={`s-${s.nom}`}>
                      <text x={x + L - 12} y={cy + 4} fontSize={11} textAnchor="end" fill="var(--texte)">
                        {s.nom}
                      </text>
                      <circle cx={x + L} cy={cy} r={4.5} fill={COULEURS_SOCKETS[s.type] ?? COULEURS_SOCKETS.float} stroke="#111" />
                    </g>
                  )
                })}
                {entrees.map((s, i) => {
                  const cy = y + ENTETE + (sorties.length + i) * RANG + RANG / 2
                  return (
                    <g key={`e-${s.nom}`}>
                      <circle cx={x} cy={cy} r={4.5} fill={COULEURS_SOCKETS[s.type] ?? COULEURS_SOCKETS.float} stroke="#111" />
                      <text x={x + 12} y={cy + 4} fontSize={11} fill="var(--texte)">
                        {s.nom}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>
      {legende && <figcaption className="mt-2 text-sm text-doux">{legende}</figcaption>}
    </figure>
  )
}
