import { useMemo } from 'react'
import { defineModule } from '../briques/module'
import { formater } from '../briques/math'
import { ExecutionPasAPas } from '../briques/pas-a-pas/ExecutionPasAPas'
import { tracer, type Etape } from '../briques/pas-a-pas/trace'

const code = (n: number, r: number) => `import math

n = ${n}
rayon = ${formater(r, 2)}
points = []
for i in range(n):
    angle = i * 2 * math.pi / n
    x = math.cos(angle) * rayon
    y = math.sin(angle) * rayon
    points.append((round(x, 2), round(y, 2)))
print(len(points), "points")`

const r2 = (x: number) => Math.round(x * 100) / 100

function etapes(n: number, rayon: number) {
  return tracer(function* (print) {
    yield [3, { n }]
    yield [4, { n, rayon }]
    const points: [number, number][] = []
    yield [5, { n, rayon, points }]
    for (let i = 0; i < n; i++) {
      yield [6, { n, rayon, points, i }, i === 0 ? 'range(n) donne i = 0, 1, …, n − 1.' : undefined]
      const angle = (i * 2 * Math.PI) / n
      yield [7, { n, rayon, points, i, angle }]
      const x = Math.cos(angle) * rayon
      yield [8, { n, rayon, points, i, angle, x }]
      const y = Math.sin(angle) * rayon
      yield [9, { n, rayon, points, i, angle, x, y }]
      points.push([r2(x), r2(y)])
      yield [10, { n, rayon, points, i, angle, x, y }]
    }
    print(points.length, 'points')
    yield [11, { n, rayon, points }]
  })
}

function Cercle({ e, rayon }: { e: Etape; rayon: number }) {
  const pts = (e.variables.points ?? []) as [number, number][]
  const angle = e.variables.angle as number | undefined
  const s = 70
  return (
    <svg viewBox="-100 -100 200 200" className="absolute inset-0 m-auto h-full max-h-full w-full p-2" aria-label="Points placés">
      <circle r={s * rayon} fill="none" stroke="var(--bord)" strokeDasharray="3 3" />
      <line x1={-95} x2={95} stroke="var(--bord)" />
      <line y1={-95} y2={95} stroke="var(--bord)" />
      {angle !== undefined && (
        <line x2={Math.cos(angle) * s * rayon} y2={-Math.sin(angle) * s * rayon} stroke="var(--v-orange)" strokeWidth={1.5} />
      )}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x * s} cy={-y * s} r={4.5} fill={i === pts.length - 1 && e.ligne === 10 ? 'var(--accent)' : 'var(--v-bleu)'} />
      ))}
    </svg>
  )
}

/** Démo de la brique « Exécution pas à pas » : une boucle qui place des points sur un cercle. */
export default defineModule({
  id: 'BouclePasAPas',
  titre: 'Une boucle qui place des points',
  description: 'Avance ligne par ligne et regarde les variables changer.',
  brique: 'pas-a-pas',
  disposition: 'dessous',
  hauteurVue: 'h-[38rem] md:h-[24rem]',
  variables: {
    n: { type: 'nombre', defaut: 6, min: 1, max: 12, pas: 1, couleur: 'bleu', libelle: 'Nombre de points', symbole: 'n' },
    rayon: { type: 'nombre', defaut: 1, min: 0.3, max: 1.3, pas: 0.05, couleur: 'vert', libelle: 'Rayon', symbole: 'rayon' },
  },
  Vue: ({ v }) => {
    const e = useMemo(() => etapes(v.n, v.rayon), [v.n, v.rayon])
    return <ExecutionPasAPas code={code(v.n, v.rayon)} langage="python" etapes={e} rendu={(et) => <Cercle e={et} rayon={v.rayon} />} />
  },
})
