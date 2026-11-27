import { useMemo } from 'react'
import { defineModule } from '../briques/module'
import type { Vec3 } from '../briques/math'
import { TableurAttributs } from '../briques/tableur/TableurAttributs'

/** Grille de n × n points déformée par une onde, comme un Grid + Set Position dans Geometry Nodes. */
function grille(n: number, frequence: number, amplitude: number) {
  const positions: Vec3[] = []
  const hauteur: number[] = []
  const aretes: [number, number][] = []
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : -1.5 + (3 * i) / (n - 1)
      const y = n === 1 ? 0 : -1.5 + (3 * j) / (n - 1)
      const h = amplitude * Math.sin(frequence * x) * Math.cos(frequence * y)
      positions.push([x, y, h])
      hauteur.push(h)
      const k = j * n + i
      if (i < n - 1) aretes.push([k, k + 1])
      if (j < n - 1) aretes.push([k, k + n])
    }
  return { positions, hauteur, aretes }
}

/** Démo de la brique « Tableur d'attributs » : une grille et ses attributs par point. */
export default defineModule({
  id: 'AttributsPlayground',
  titre: 'Les attributs d’une grille',
  description: 'Survole une ligne du tableau ou un point de la vue : les deux restent liés.',
  brique: 'tableur-attributs',
  disposition: 'dessous',
  hauteurVue: 'h-[34rem] md:h-[24rem]',
  variables: {
    n: { type: 'nombre', defaut: 8, min: 2, max: 24, pas: 1, couleur: 'bleu', libelle: 'Points par côté', symbole: 'n' },
    frequence: { type: 'nombre', defaut: 2, min: 0, max: 6, pas: 0.1, couleur: 'orange', libelle: 'Fréquence de l’onde', symbole: 'f' },
    amplitude: { type: 'nombre', defaut: 0.4, min: 0, max: 1, pas: 0.05, couleur: 'vert', libelle: 'Amplitude', symbole: 'h' },
  },
  presets: [
    { nom: 'Plat', valeurs: { frequence: 0, amplitude: 0 } },
    { nom: 'Vagues fines', valeurs: { n: 20, frequence: 4, amplitude: 0.25 } },
  ],
  defi: {
    texte: 'règle la grille pour obtenir exactement 144 lignes dans le tableau.',
    reussi: ({ n }) => n * n === 144,
  },
  Vue: ({ v }) => {
    const g = useMemo(() => grille(v.n, v.frequence, v.amplitude), [v.n, v.frequence, v.amplitude])
    const distance = useMemo(() => g.positions.map(([x, y]) => Math.hypot(x, y)), [g])
    return (
      <TableurAttributs
        taille={1.8}
        positions={g.positions}
        aretes={g.aretes}
        colorerPar="hauteur"
        colonnes={[
          { nom: 'position', valeurs: g.positions },
          { nom: 'hauteur', valeurs: g.hauteur, couleur: 'vert' },
          { nom: 'distance', valeurs: distance },
        ]}
      />
    )
  },
  Lecture: ({ v }) => (
    <p className="text-xs text-doux">
      Une ligne par point : {v.n} × {v.n} = <span className="font-mono text-texte">{v.n * v.n}</span>. La colonne <span className="text-[var(--v-vert)]">hauteur</span> colore les
      points, comme un attribut affiché par Viewer.
    </p>
  ),
})
