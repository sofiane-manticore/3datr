import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bounds, OrbitControls } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ShaderMaterial } from 'three'
import { fragmentComplet, lireErreurs, valeurGl, VERTEX, type ErreurGlsl, type ValeurUniform } from './glsl'

/**
 * Brique « Aperçu de shader » : un fragment shader GLSL sur une forme simple.
 * Les uniforms suivent les curseurs du module ; `uTemps` (secondes) et les varyings
 * vUv, vNormal (monde), vPosition (objet) sont toujours disponibles.
 * Une erreur de compilation est affichée avec le numéro de ligne du code du module.
 *
 *   <ApercuShader code={`void main(){ gl_FragColor = vec4(vUv, 0.0, 1.0); }`} uniforms={{ uFrequence: v.f }} />
 */

export type Forme = 'plan' | 'sphere' | 'tore' | 'cube'

export function ApercuShader({
  code,
  uniforms = {},
  forme = 'plan',
  anime = false,
  onErreurs,
  surimpression,
}: {
  code: string
  uniforms?: Record<string, ValeurUniform>
  forme?: Forme
  /** Fait avancer `uTemps` en continu. */
  anime?: boolean
  onErreurs?: (e: ErreurGlsl[]) => void
  surimpression?: ReactNode
}) {
  // La liste des uniforms (pas leurs valeurs) fait partie du programme : nouvelle compilation si elle change.
  const signature = Object.keys(uniforms).sort().join(',')
  const fragment = useMemo(() => fragmentComplet(code, uniforms), [code, signature]) // eslint-disable-line react-hooks/exhaustive-deps
  const [erreurs, setErreurs] = useState<{ fragment: string; liste: ErreurGlsl[] } | null>(null)
  const courant = useRef(fragment)
  courant.current = fragment
  const affichees = erreurs && erreurs.fragment === fragment ? erreurs.liste : []

  useEffect(() => onErreurs?.(affichees), [affichees.length, fragment]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-0 touch-none">
      <Canvas
        frameloop={anime ? 'always' : 'demand'}
        dpr={[1, 2]}
        camera={{ position: forme === 'plan' ? [0, 0, 2.4] : [1.6, 1.1, 2.2], fov: 40 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.debug.checkShaderErrors = true
          gl.debug.onShaderError = (ctx, _prog, _vs, fs) => {
            const source = ctx.getShaderSource(fs) ?? ''
            const journal = ctx.getShaderInfoLog(fs) ?? ''
            // Le journal concerne le fragment actuellement compilé ; on garde le texte du module pour le reconnaître.
            const f = courant.current
            setErreurs({ fragment: f, liste: lireErreurs(journal || 'Erreur de compilation inconnue', source) })
          }
        }}
      >
        {/* Bounds cadre l'objet quelle que soit la forme de la vue (portrait, paysage). */}
        <CameraForme forme={forme} />
        <Bounds key={forme} fit observe margin={forme === 'plan' ? 1.05 : 1.15}>
          <Objet key={fragment} forme={forme} fragment={fragment} uniforms={uniforms} />
        </Bounds>
        <OrbitControls makeDefault enablePan={false} minDistance={1.2} maxDistance={6} />
      </Canvas>
      {surimpression && <div className="pointer-events-none absolute top-2 left-2 [&>*]:pointer-events-auto">{surimpression}</div>}
      {affichees.length > 0 && (
        <div role="alert" className="absolute inset-x-2 bottom-2 max-h-[45%] overflow-auto rounded-md border border-[var(--v-rouge)]/50 bg-fond/90 p-2 font-mono text-xs backdrop-blur">
          {affichees.map((e, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 text-[var(--v-rouge)]">{e.ligne ? `ligne ${e.ligne}` : 'erreur'}</span>
              <span className="text-texte">{e.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Remet la caméra de face (plan) ou de trois quarts (volumes) quand la forme change. */
function CameraForme({ forme }: { forme: Forme }) {
  const camera = useThree((s) => s.camera)
  useLayoutEffect(() => {
    camera.position.set(...((forme === 'plan' ? [0, 0, 2.4] : [1.6, 1.1, 2.2]) as [number, number, number]))
    camera.lookAt(0, 0, 0)
  }, [forme, camera])
  return null
}

function Objet({ forme, fragment, uniforms }: { forme: Forme; fragment: string; uniforms: Record<string, ValeurUniform> }) {
  const mat = useRef<ShaderMaterial>(null)
  const invalidate = useThree((s) => s.invalidate)
  // Objet d'uniforms stable : three.js lit `.value` à chaque image, on le met à jour sur place.
  const u = useMemo(() => {
    const o: Record<string, { value: unknown }> = { uTemps: { value: 0 } }
    for (const [n, v] of Object.entries(uniforms)) o[n] = { value: valeurGl(v) }
    return o
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    for (const [n, v] of Object.entries(uniforms)) {
      if (u[n]) u[n].value = valeurGl(v)
    }
    invalidate()
  })

  useFrame((_, dt) => {
    u.uTemps.value = (u.uTemps.value as number) + dt
  })

  return (
    <mesh rotation={forme === 'tore' ? [Math.PI / 2.6, 0, 0] : [0, 0, 0]}>
      {forme === 'plan' && <planeGeometry args={[1.8, 1.8]} />}
      {forme === 'sphere' && <sphereGeometry args={[0.9, 96, 64]} />}
      {forme === 'tore' && <torusGeometry args={[0.65, 0.28, 64, 128]} />}
      {forme === 'cube' && <boxGeometry args={[1.2, 1.2, 1.2]} />}
      <shaderMaterial ref={mat} vertexShader={VERTEX} fragmentShader={fragment} uniforms={u} side={forme === 'plan' ? 2 : 0} />
    </mesh>
  )
}
