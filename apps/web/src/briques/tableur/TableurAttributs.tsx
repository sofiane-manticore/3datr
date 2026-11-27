import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Color, Object3D, type InstancedMesh } from 'three'
import { cssVariable, teinte } from '../couleurs'
import { formater, type Vec3 } from '../math'
import { Etiquette, Scene3D, useScene } from '../scene/Scene3D'
import type { CouleurVariable } from '../types'

/**
 * Brique « Tableur d'attributs » : le Spreadsheet de Blender relié à la vue 3D.
 * Une ligne par élément du domaine (points, faces…), une colonne par attribut.
 * Survoler une ligne allume le point dans la vue ; survoler un point surligne sa ligne.
 * Le tableau est virtualisé : seules les lignes visibles sont dans le DOM.
 */

export interface ColonneAttribut {
  nom: string
  valeurs: (number | Vec3)[]
  couleur?: CouleurVariable
}

const HAUTEUR_LIGNE = 26
/** Hauteur de l'en-tête collant (nom de l'attribut, puis composantes). */
const ENTETE = HAUTEUR_LIGNE + 15

export function TableurAttributs({
  positions,
  colonnes,
  domaine = 'Point',
  aretes = [],
  colorerPar,
  taille = 2,
  surimpression,
}: {
  positions: Vec3[]
  colonnes: ColonneAttribut[]
  domaine?: string
  /** Paires d'indices à relier (fil de fer du maillage). */
  aretes?: [number, number][]
  /** Nom d'une colonne float qui colore les points (dégradé du plus petit au plus grand). */
  colorerPar?: string
  taille?: number
  surimpression?: ReactNode
}) {
  const [actif, setActif] = useState<number | null>(null)
  const [source, setSource] = useState<'table' | 'vue'>('table')
  const tableau = useRef<HTMLDivElement>(null)
  const [defil, setDefil] = useState(0)
  const [hauteur, setHauteur] = useState(300)

  useLayoutEffect(() => {
    const el = tableau.current!
    const obs = new ResizeObserver(() => setHauteur(el.clientHeight))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Point survolé dans la vue : on amène sa ligne à l'écran.
  useLayoutEffect(() => {
    if (actif === null || source !== 'vue' || !tableau.current) return
    const el = tableau.current
    const haut = actif * HAUTEUR_LIGNE
    const visibleH = el.clientHeight - ENTETE
    if (haut < el.scrollTop || haut + HAUTEUR_LIGNE > el.scrollTop + visibleH) el.scrollTop = haut - visibleH / 2
  }, [actif, source])

  const n = positions.length
  const debut = Math.max(0, Math.floor(defil / HAUTEUR_LIGNE) - 4)
  const fin = Math.min(n, Math.ceil((defil + hauteur) / HAUTEUR_LIGNE) + 4)
  const champ = colonnes.find((c) => c.nom === colorerPar)

  const cols = colonnes.flatMap((c) =>
    typeof c.valeurs[0] === 'number'
      ? [{ sous: '', lire: (i: number) => c.valeurs[i] as number, couleur: c.couleur }]
      : (['x', 'y', 'z'] as const).map((a, k) => ({ sous: a, lire: (i: number) => (c.valeurs[i] as Vec3)[k], couleur: c.couleur })),
  )

  return (
    <div className="absolute inset-0 grid grid-rows-[minmax(0,1fr)_minmax(0,45%)] md:grid-cols-[minmax(0,1fr)_minmax(0,48%)] md:grid-rows-1">
      <div className="relative min-h-0 border-bord max-md:border-b md:border-r">
        <Scene3D taille={taille} surimpression={surimpression}>
          <Points positions={positions} actif={actif} valeurs={champ?.valeurs as number[] | undefined} couleur={champ?.couleur} onSurvol={(i) => (setSource('vue'), setActif(i))} />
          {aretes.length > 0 && <Fil positions={positions} aretes={aretes} />}
          {actif !== null && positions[actif] && (
            <Etiquette position={[positions[actif][0], positions[actif][1], positions[actif][2] + 0.22]} couleur="accent">
              {actif}
            </Etiquette>
          )}
        </Scene3D>
      </div>
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-bord px-3 py-1.5 text-xs text-doux">
          <span>
            Domaine <span className="text-texte">{domaine}</span>
          </span>
          <span className="font-mono">{n} lignes</span>
        </div>
        <div
          ref={tableau}
          className="min-h-0 flex-1 overflow-auto font-mono text-xs tabular-nums"
          onScroll={(e) => setDefil(e.currentTarget.scrollTop)}
          onPointerLeave={() => setActif(null)}
          role="table"
          aria-label={`Attributs du domaine ${domaine}`}
          aria-rowcount={n + 1}
        >
          <div className="sticky top-0 z-10 border-b border-bord bg-surface" role="rowgroup">
            <div role="row" className="flex" style={{ height: HAUTEUR_LIGNE }}>
              <div role="columnheader" className="w-12 shrink-0 px-2 py-1 text-doux">
                #
              </div>
              {colonnes.map((c) => (
                <div
                  key={c.nom}
                  role="columnheader"
                  className={`${typeof c.valeurs[0] === 'number' ? 'w-[4.5rem]' : 'w-[13.5rem]'} shrink-0 truncate px-2 py-1 text-right`}
                  style={{ color: c.couleur ? cssVariable(c.couleur) : undefined }}
                  title={c.nom}
                >
                  {c.nom}
                </div>
              ))}
            </div>
            <div className="flex text-[10px] text-doux" aria-hidden="true">
              <div className="w-12 shrink-0" />
              {cols.map((c, k) => (
                <div key={k} className="w-[4.5rem] shrink-0 px-2 pb-1 text-right">
                  {c.sous}
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: n * HAUTEUR_LIGNE, position: 'relative' }}>
            {Array.from({ length: fin - debut }, (_, j) => {
              const i = debut + j
              return (
                <div
                  key={i}
                  role="row"
                  aria-rowindex={i + 2}
                  className={`absolute inset-x-0 flex ${i === actif ? 'bg-accent/20' : i % 2 ? 'bg-surface-2/40' : ''}`}
                  style={{ top: i * HAUTEUR_LIGNE, height: HAUTEUR_LIGNE }}
                  onPointerEnter={() => (setSource('table'), setActif(i))}
                >
                  <div role="cell" className="w-12 shrink-0 px-2 py-1 text-doux">
                    {i}
                  </div>
                  {cols.map((c, k) => (
                    <div key={k} role="cell" className="w-[4.5rem] shrink-0 px-2 py-1 text-right">
                      {formater(c.lire(i), 3)}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

const objet = new Object3D()
const couleur = new Color()

function Points({
  positions,
  actif,
  valeurs,
  couleur: teinteChamp,
  onSurvol,
}: {
  positions: Vec3[]
  actif: number | null
  valeurs?: number[]
  couleur?: CouleurVariable
  onSurvol: (i: number | null) => void
}) {
  const { jetons } = useScene()
  const ref = useRef<InstancedMesh>(null)
  const [min, max] = useMemo(() => (valeurs ? [Math.min(...valeurs), Math.max(...valeurs)] : [0, 1]), [valeurs])

  useLayoutEffect(() => {
    const m = ref.current!
    const froid = new Color(jetons.doux)
    const chaud = new Color(teinteChamp ? teinte(jetons, teinteChamp) : jetons.accent)
    positions.forEach((p, i) => {
      objet.position.set(...p)
      objet.scale.setScalar(i === actif ? 1.9 : 1)
      objet.updateMatrix()
      m.setMatrixAt(i, objet.matrix)
      const t = valeurs ? (max - min < 1e-9 ? 1 : (valeurs[i] - min) / (max - min)) : 0
      couleur.copy(froid).lerp(chaud, t)
      if (i === actif) couleur.set(jetons.accent)
      m.setColorAt(i, couleur)
    })
    m.count = positions.length
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [positions, actif, valeurs, min, max, jetons, teinteChamp])

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(1, positions.length)]}
      key={positions.length}
      onPointerMove={(e) => {
        e.stopPropagation()
        if (e.instanceId !== undefined && e.instanceId !== actif) onSurvol(e.instanceId)
      }}
      onPointerOut={() => onSurvol(null)}
    >
      <sphereGeometry args={[0.045, 12, 8]} />
      <meshStandardMaterial roughness={0.5} />
    </instancedMesh>
  )
}

function Fil({ positions, aretes }: { positions: Vec3[]; aretes: [number, number][] }) {
  // Une polyligne par arête suffirait ; un seul trait en segments discontinus est bien plus léger.
  const pts = useMemo(() => aretes.flatMap(([a, b]) => [positions[a], positions[b]]), [positions, aretes])
  return <TraitSegments points={pts} />
}

function TraitSegments({ points }: { points: Vec3[] }) {
  const { jetons } = useScene()
  const geo = useMemo(() => new Float32Array(points.flat()), [points])
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geo, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={jetons.bord} transparent opacity={0.9} />
    </lineSegments>
  )
}

