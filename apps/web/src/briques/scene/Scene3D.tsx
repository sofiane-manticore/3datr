import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { Grid, Html, Line, OrbitControls } from '@react-three/drei'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Plane, Quaternion, Vector3, type Mesh } from 'three'
import { teinte, useJetons, type Jetons } from '../couleurs'
import { clamp, normalize, type Vec3 } from '../math'
import type { CouleurVariable } from '../types'

/**
 * Brique « Scène vecteurs 3D » : canevas R3F avec grille, repère, caméra orbitale,
 * et une convention d'axes au choix. Les coordonnées des enfants sont celles du logiciel :
 * en Z-up (Blender, Unreal) le vecteur (0, 0, 1) pointe vers le haut ; en Y-up (three.js,
 * Unity, Maya), c'est (0, 1, 0). La conversion vers three.js (Y-up) est une rotation du groupe.
 */

export type Convention = 'z' | 'y'
const CLE_AXES = '3datr-axes'

interface ContexteScene {
  jetons: Jetons
  taille: number
  convention: Convention
}
const Ctx = createContext<ContexteScene | null>(null)
export const useScene = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('À utiliser dans <Scene3D>')
  return c
}

function useConvention(imposee?: Convention): [Convention, (c: Convention) => void] {
  const [c, setC] = useState<Convention>(imposee ?? 'z')
  useEffect(() => {
    if (imposee) return
    try {
      const s = localStorage.getItem(CLE_AXES)
      if (s === 'y' || s === 'z') setC(s)
    } catch {
      /* rien */
    }
  }, [imposee])
  const changer = (n: Convention) => {
    setC(n)
    try {
      localStorage.setItem(CLE_AXES, n)
    } catch {
      /* rien */
    }
  }
  return [c, changer]
}

export interface PropsScene3D {
  children?: ReactNode
  /** Demi-côté de la zone utile, en unités (grille, axes, limites des points). */
  taille?: number
  grille?: boolean
  axes?: boolean
  /** Bouton Z-up / Y-up en surimpression. */
  basculeAxes?: boolean
  /** Force une convention (sinon : préférence du visiteur, Z-up par défaut). */
  convention?: Convention
  camera?: Vec3
  /** Animation continue (temps, rotation) ; sinon on ne redessine qu'au changement. */
  continu?: boolean
  surimpression?: ReactNode
}

export function Scene3D({ children, taille = 2, grille = true, axes = true, basculeAxes = true, convention, camera, continu, surimpression }: PropsScene3D) {
  const jetons = useJetons()
  const [conv, setConv] = useConvention(convention)
  const ctx = useMemo(() => ({ jetons, taille, convention: conv }), [jetons, taille, conv])
  const cam = camera ?? [taille * 1.45, taille * 1.15, taille * 1.9]

  return (
    <div className="absolute inset-0 touch-none select-none">
      <Canvas
        frameloop={continu ? 'always' : 'demand'}
        dpr={[1, 2]}
        camera={{ position: cam, fov: 40, near: 0.05, far: 200 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <Ctx.Provider value={ctx}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 6, 4]} intensity={1.6} />
          {grille && (
            <Grid
              args={[taille * 2, taille * 2]}
              cellSize={0.25}
              sectionSize={1}
              cellThickness={0.6}
              sectionThickness={1}
              cellColor={jetons.bord}
              sectionColor={jetons.theme === 'sombre' ? '#3c4250' : '#c3c8d2'}
              fadeDistance={taille * 9}
              fadeStrength={1.5}
              infiniteGrid
              position={[0, -0.001, 0]}
            />
          )}
          <group rotation={conv === 'z' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
            {axes && <Repere taille={taille} />}
            {children}
          </group>
          <OrbitControls makeDefault enableDamping={false} minDistance={1} maxDistance={taille * 10} />
        </Ctx.Provider>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <div className="pointer-events-auto">{surimpression}</div>
        {basculeAxes && !convention && (
          <button
            type="button"
            onClick={() => setConv(conv === 'z' ? 'y' : 'z')}
            className="pointer-events-auto rounded-md border border-bord bg-fond/80 px-2 py-0.5 font-mono text-xs text-doux backdrop-blur hover:text-texte"
            title={conv === 'z' ? 'Axe du haut : Z (Blender, Unreal). Cliquer pour passer en Y-up.' : 'Axe du haut : Y (three.js, Unity, Maya). Cliquer pour passer en Z-up.'}
          >
            {conv === 'z' ? 'Z-up' : 'Y-up'}
          </button>
        )}
      </div>
    </div>
  )
}

const COULEURS_AXES = { x: '#d0575f', y: '#6aa13d', z: '#4f7fd0' }

function Repere({ taille }: { taille: number }) {
  const { jetons } = useScene()
  const axes: { n: 'x' | 'y' | 'z'; v: Vec3 }[] = [
    { n: 'x', v: [1, 0, 0] },
    { n: 'y', v: [0, 1, 0] },
    { n: 'z', v: [0, 0, 1] },
  ]
  return (
    <>
      {axes.map(({ n, v }) => (
        <group key={n}>
          <Line points={[v.map((c) => -c * taille) as Vec3, v.map((c) => c * taille) as Vec3]} color={COULEURS_AXES[n]} lineWidth={1.25} transparent opacity={0.75} />
          <Html position={v.map((c) => c * (taille + 0.18)) as Vec3} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <span className="font-mono text-[11px] font-semibold" style={{ color: COULEURS_AXES[n], textShadow: `0 0 3px ${jetons.surface}` }}>
              {n.toUpperCase()}
            </span>
          </Html>
        </group>
      ))}
    </>
  )
}

const HAUT = new Vector3(0, 1, 0)

/** Flèche de `de` vers `vers`, corps cylindrique et pointe conique. */
export function Fleche({
  de = [0, 0, 0],
  vers,
  couleur = 'accent',
  epaisseur = 0.025,
  etiquette,
  opacite = 1,
}: {
  de?: Vec3
  vers: Vec3
  couleur?: CouleurVariable | string
  epaisseur?: number
  etiquette?: ReactNode
  opacite?: number
}) {
  const { jetons } = useScene()
  const c = couleur === 'accent' ? jetons.accent : teinte(jetons, couleur)
  const d = new Vector3(vers[0] - de[0], vers[1] - de[1], vers[2] - de[2])
  const l = d.length()
  const q = useMemo(() => new Quaternion(), [])
  if (l < 1e-6) return null
  q.setFromUnitVectors(HAUT, d.clone().normalize())
  const pointe = Math.min(0.18, l * 0.4)
  const corps = l - pointe
  return (
    <group position={de} quaternion={q}>
      <mesh position={[0, corps / 2, 0]}>
        <cylinderGeometry args={[epaisseur, epaisseur, corps, 12]} />
        <meshBasicMaterial color={c} transparent={opacite < 1} opacity={opacite} />
      </mesh>
      <mesh position={[0, corps + pointe / 2, 0]}>
        <coneGeometry args={[epaisseur * 3, pointe, 18]} />
        <meshBasicMaterial color={c} transparent={opacite < 1} opacity={opacite} />
      </mesh>
      {etiquette && (
        <Html position={[0, l + 0.16, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
          <span className="font-mono text-xs font-semibold whitespace-nowrap" style={{ color: c, textShadow: `0 0 3px ${jetons.surface}, 0 0 6px ${jetons.surface}` }}>
            {etiquette}
          </span>
        </Html>
      )}
    </group>
  )
}

/** Étiquette HTML posée à une position de la scène. */
export function Etiquette({ position, couleur, children }: { position: Vec3; couleur?: CouleurVariable | string; children: ReactNode }) {
  const { jetons } = useScene()
  return (
    <Html position={position} center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
      <span
        className="font-mono text-xs whitespace-nowrap"
        style={{ color: couleur ? teinte(jetons, couleur) : jetons.doux, textShadow: `0 0 3px ${jetons.surface}, 0 0 6px ${jetons.surface}` }}
      >
        {children}
      </span>
    </Html>
  )
}

/** Segment ou polyligne, pleine ou pointillée. */
export function Trait({ points, couleur, pointille, epaisseur = 1.5, opacite = 1 }: { points: Vec3[]; couleur?: CouleurVariable | string; pointille?: boolean; epaisseur?: number; opacite?: number }) {
  const { jetons } = useScene()
  return (
    <Line
      points={points}
      color={couleur ? teinte(jetons, couleur) : jetons.doux}
      lineWidth={epaisseur}
      dashed={pointille}
      dashSize={0.08}
      gapSize={0.06}
      transparent={opacite < 1}
      opacity={opacite}
    />
  )
}

/** Arc de cercle entre deux directions, pour montrer un angle. */
export function Arc({ a, b, rayon = 0.45, couleur = 'vert', etiquette }: { a: Vec3; b: Vec3; rayon?: number; couleur?: CouleurVariable | string; etiquette?: ReactNode }) {
  const na = new Vector3(...normalize(a))
  const nb = new Vector3(...normalize(b))
  if (na.lengthSq() < 0.5 || nb.lengthSq() < 0.5) return null
  const theta = na.angleTo(nb)
  if (theta < 1e-3) return null
  // Axe de rotation ; si a et b sont opposés, n'importe quelle perpendiculaire convient.
  const axe = new Vector3().crossVectors(na, nb)
  if (axe.lengthSq() < 1e-8) axe.set(0, 0, 1).cross(na).lengthSq() > 1e-6 ? axe.set(0, 0, 1).cross(na) : axe.set(0, 1, 0).cross(na)
  axe.normalize()
  const pts: Vec3[] = []
  const N = 32
  const q = new Quaternion()
  for (let i = 0; i <= N; i++) {
    q.setFromAxisAngle(axe, (theta * i) / N)
    const p = na.clone().applyQuaternion(q).multiplyScalar(rayon)
    pts.push([p.x, p.y, p.z])
  }
  const milieu = pts[N / 2].map((x) => x * 1.35) as Vec3
  return (
    <>
      <Trait points={pts} couleur={couleur} epaisseur={2} />
      {etiquette && (
        <Etiquette position={milieu} couleur={couleur}>
          {etiquette}
        </Etiquette>
      )}
    </>
  )
}

const tmp = new Vector3()
const normalePlan = new Vector3()

/**
 * Point que l'on attrape et déplace (souris ou doigt). Le déplacement se fait dans le plan
 * face à la caméra passant par le point ; avec `plan="sol"`, il reste à hauteur constante.
 * Les coordonnées sont arrondies au `pas` et bornées à la zone de la scène.
 */
export function PointDeplacable({
  position,
  onChange,
  couleur = 'accent',
  rayon = 0.075,
  pas = 0.05,
  plan = 'ecran',
  limite,
}: {
  position: Vec3
  onChange: (p: Vec3) => void
  couleur?: CouleurVariable | string
  rayon?: number
  pas?: number
  plan?: 'ecran' | 'sol'
  limite?: number
}) {
  const { jetons, taille, convention } = useScene()
  const ref = useRef<Mesh>(null)
  const plane = useMemo(() => new Plane(), [])
  const drag = useRef(false)
  const [survol, setSurvol] = useState(false)
  const { camera, controls, gl } = useThree()
  const c = couleur === 'accent' ? jetons.accent : teinte(jetons, couleur)
  const borne = limite ?? taille

  const commencer = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    ;(e.target as unknown as Element).setPointerCapture(e.pointerId)
    drag.current = true
    if (controls) (controls as unknown as { enabled: boolean }).enabled = false
    ref.current!.getWorldPosition(tmp)
    if (plan === 'sol') normalePlan.set(0, 1, 0)
    else camera.getWorldDirection(normalePlan)
    plane.setFromNormalAndCoplanarPoint(normalePlan, tmp)
    gl.domElement.style.cursor = 'grabbing'
  }
  const deplacer = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current || !ref.current?.parent) return
    if (!e.ray.intersectPlane(plane, tmp)) return
    ref.current.parent.worldToLocal(tmp)
    const p = [tmp.x, tmp.y, tmp.z].map((x) => clamp(Math.round(x / pas) * pas, -borne, borne)) as Vec3
    // Au sol, la hauteur ne bouge pas (axe z en Z-up, y en Y-up).
    if (plan === 'sol') p[convention === 'z' ? 2 : 1] = position[convention === 'z' ? 2 : 1]
    if (p.some((x, i) => Math.abs(x - position[i]) > 1e-9)) onChange(p.map((x) => Math.round(x * 1e4) / 1e4) as Vec3)
  }
  const finir = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    drag.current = false
    ;(e.target as unknown as Element).releasePointerCapture?.(e.pointerId)
    if (controls) (controls as unknown as { enabled: boolean }).enabled = true
    gl.domElement.style.cursor = survol ? 'grab' : ''
  }

  return (
    <group position={position}>
      <mesh
        ref={ref}
        onPointerDown={commencer}
        onPointerMove={deplacer}
        onPointerUp={finir}
        onPointerCancel={finir}
        onPointerOver={(e) => {
          e.stopPropagation()
          setSurvol(true)
          if (!drag.current) gl.domElement.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          setSurvol(false)
          if (!drag.current) gl.domElement.style.cursor = ''
        }}
      >
        {/* Zone de prise plus grande que le point visible : plus facile au doigt. */}
        <sphereGeometry args={[rayon * 2.6, 16, 12]} />
        <meshBasicMaterial transparent opacity={survol ? 0.18 : 0} color={c} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null}>
        <sphereGeometry args={[rayon, 24, 16]} />
        <meshStandardMaterial color={c} roughness={0.4} />
      </mesh>
    </group>
  )
}
