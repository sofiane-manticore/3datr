import '@xyflow/react/dist/style.css'
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { COULEURS_CATEGORIES, COULEURS_SOCKETS } from '../../concept/NodeTree'
import { useJetons } from '../couleurs'
import { ApercuShader, type Forme } from '../shader/ApercuShader'
import { compiler, creeCycle, defNoeud, NOEUDS, paramsParDefaut, type Graphe, type NoeudGraphe, type Params, type TypeSocket, type ValeurSocket } from './bibliotheque'
import type { Vec3 } from '../math'

/**
 * Brique « Mini éditeur de nodes » : un node tree façon Shader Editor, compilé à chaque
 * changement en fragment shader et affiché dans l'aperçu. On branche, débranche
 * (glisser un lien hors de son entrée), ajoute et supprime des nodes (touche Suppr).
 */

type DonneesNoeud = { type: string; params: Params; valeurs: Record<string, ValeurSocket> }
type NoeudRF = Node<DonneesNoeud, 'noeud'>

const couleurSocket = (t: TypeSocket) => COULEURS_SOCKETS[t]

function versRF(g: Graphe): { nodes: NoeudRF[]; edges: Edge[] } {
  return {
    nodes: g.noeuds.map((n) => ({
      id: n.id,
      type: 'noeud',
      position: { x: n.x, y: n.y },
      deletable: n.type !== 'sortie',
      data: { type: n.type, params: { ...paramsParDefaut(defNoeud(n.type)!), ...n.params }, valeurs: { ...n.valeurs } },
    })),
    edges: g.liens.map((l) => lienRF(g.noeuds, l.de, l.sortie, l.vers, l.entree)),
  }
}

function lienRF(noeuds: { id: string; type: string }[], de: string, sortie: string, vers: string, entree: string): Edge {
  const t = defNoeud(noeuds.find((n) => n.id === de)?.type ?? '')?.sorties.find((s) => s.nom === sortie)?.type ?? 'float'
  return { id: `${de}.${sortie}>${vers}.${entree}`, source: de, sourceHandle: `s:${sortie}`, target: vers, targetHandle: `e:${entree}`, style: { stroke: couleurSocket(t), strokeWidth: 2 } }
}

function depuisRF(nodes: NoeudRF[], edges: Edge[]): Graphe {
  return {
    noeuds: nodes.map((n) => ({ id: n.id, type: n.data.type, x: Math.round(n.position.x), y: Math.round(n.position.y), params: n.data.params, valeurs: n.data.valeurs })),
    liens: edges.map((e) => ({ de: e.source, sortie: e.sourceHandle!.slice(2), vers: e.target, entree: e.targetHandle!.slice(2) })),
  }
}

const CtxEditeur = createContext<{ maj: (id: string, d: Partial<DonneesNoeud>) => void; branchees: Set<string> } | null>(null)

export function EditeurNodes(props: { graphe: Graphe; onChange: (g: Graphe) => void; forme?: Forme }) {
  return (
    <ReactFlowProvider>
      <Editeur {...props} />
    </ReactFlowProvider>
  )
}

function Editeur({ graphe, onChange, forme = 'sphere' }: { graphe: Graphe; onChange: (g: Graphe) => void; forme?: Forme }) {
  const jetons = useJetons()
  const initial = useMemo(() => versRF(graphe), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [nodes, setNodes, onNodesChange] = useNodesState<NoeudRF>(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges)
  const rf = useReactFlow()
  const emis = useRef(JSON.stringify(graphe))

  // Graphe actuel → module (état partagé, réinitialisation, préréglages).
  const actuel = useMemo(() => depuisRF(nodes, edges), [nodes, edges])
  useEffect(() => {
    const j = JSON.stringify(actuel)
    if (j !== emis.current) {
      emis.current = j
      onChange(actuel)
    }
  }, [actuel, onChange])
  // Module → graphe (Réinitialiser, préréglage).
  useEffect(() => {
    const j = JSON.stringify(graphe)
    if (j === emis.current) return
    emis.current = j
    const r = versRF(graphe)
    setNodes(r.nodes)
    setEdges(r.edges)
    requestAnimationFrame(() => rf.fitView({ padding: '32px', duration: 200 }))
  }, [graphe, setNodes, setEdges, rf])

  // Cadrage une fois les nodes mesurés (leur taille réelle n'est connue qu'après le premier rendu).
  const mesures = useNodesInitialized()
  useEffect(() => {
    if (mesures) rf.fitView({ padding: '32px' })
  }, [mesures, rf])

  // La vue change de taille (mobile, rotation, panneau) : on recadre le graphe.
  const zone = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = zone.current
    if (!el) return
    const obs = new ResizeObserver(() => rf.fitView({ padding: '32px' }))
    obs.observe(el)
    return () => obs.disconnect()
  }, [rf])

  // Le shader ne dépend pas des positions : on ne recompile que si la logique change.
  const cle = JSON.stringify({ n: actuel.noeuds.map(({ x: _x, y: _y, ...r }) => r), l: actuel.liens })
  const compilation = useMemo(() => compiler(actuel), [cle]) // eslint-disable-line react-hooks/exhaustive-deps

  const maj = useCallback(
    (id: string, d: Partial<DonneesNoeud>) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...d } } : n))),
    [setNodes],
  )
  const branchees = useMemo(() => new Set(edges.map((e) => `${e.target}:${e.targetHandle}`)), [edges])

  const valide = useCallback((c: Connection | Edge) => !!c.source && !!c.target && !creeCycle(edges.map((e) => ({ de: e.source, vers: e.target })), c.source, c.target), [edges])

  const brancher = useCallback(
    (c: Connection) => {
      if (!c.sourceHandle || !c.targetHandle) return
      setEdges((es) => [
        // Une entrée ne reçoit qu'un lien : le nouveau remplace l'ancien.
        ...es.filter((e) => !(e.target === c.target && e.targetHandle === c.targetHandle)),
        lienRF(nodes.map((n) => ({ id: n.id, type: n.data.type })), c.source, c.sourceHandle!.slice(2), c.target, c.targetHandle!.slice(2)),
      ])
    },
    [nodes, setEdges],
  )

  const ajouter = (type: string) => {
    const d = defNoeud(type)!
    const boite = document.querySelector('.editeur-nodes')?.getBoundingClientRect()
    const centre = boite ? rf.screenToFlowPosition({ x: boite.left + boite.width / 2, y: boite.top + boite.height / 2 }) : { x: 0, y: 0 }
    const id = `${type}-${Math.random().toString(36).slice(2, 7)}`
    setNodes((ns) => [
      ...ns.map((n) => ({ ...n, selected: false })),
      { id, type: 'noeud', position: { x: centre.x - 80, y: centre.y - 40 }, selected: true, data: { type, params: paramsParDefaut(d), valeurs: {} } },
    ])
  }

  return (
    <div className="absolute inset-0 grid grid-rows-[minmax(0,1fr)_minmax(0,40%)] md:grid-cols-[minmax(0,1fr)_minmax(0,36%)] md:grid-rows-1">
      <div ref={zone} className="editeur-nodes relative min-h-0 border-bord max-md:border-b md:border-r">
        <CtxEditeur.Provider value={{ maj, branchees }}>
          <ReactFlow<NoeudRF, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={brancher}
            isValidConnection={valide}
            forceColorMode={jetons.theme === 'sombre' ? 'dark' : 'light'}
            fitView
            fitViewOptions={{ padding: '32px' }}
            minZoom={0.3}
            maxZoom={1.6}
            deleteKeyCode={['Backspace', 'Delete']}
            proOptions={{ hideAttribution: true }}
            edgesReconnectable
            onReconnectEnd={(_e, edge, _h, etat) => {
              // Lien lâché dans le vide : on débranche, comme dans Blender.
              if (!etat.isValid) setEdges((es) => es.filter((e) => e.id !== edge.id))
            }}
            onReconnect={(ancien, c) => {
              setEdges((es) => es.filter((e) => e.id !== ancien.id))
              brancher(c)
            }}
          >
            <Background gap={24} size={1} color={jetons.bord} />
          </ReactFlow>
        </CtxEditeur.Provider>
        <MenuAjout onAjout={ajouter} />
      </div>
      <div className="relative min-h-0">
        <ApercuShader code={compilation.code} forme={forme} anime={compilation.utiliseTemps} />
        {compilation.erreur && (
          <div role="alert" className="absolute inset-x-2 bottom-2 rounded-md border border-[var(--v-rouge)]/50 bg-fond/90 p-2 text-xs">
            {compilation.erreur}
          </div>
        )}
      </div>
    </div>
  )
}

function MenuAjout({ onAjout }: { onAjout: (type: string) => void }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div className="absolute top-2 left-2 z-10">
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        aria-expanded={ouvert}
        className="rounded-md border border-bord bg-fond/85 px-2 py-1 text-xs text-doux backdrop-blur hover:text-texte"
      >
        + Ajouter un node
      </button>
      {ouvert && (
        <ul className="mt-1 max-h-64 w-48 overflow-auto rounded-md border border-bord bg-surface p-1 text-xs shadow-lg">
          {NOEUDS.filter((n) => n.type !== 'sortie').map((n) => (
            <li key={n.type}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-surface-2"
                onClick={() => {
                  onAjout(n.type)
                  setOuvert(false)
                }}
              >
                <span className="size-2 rounded-full" style={{ background: COULEURS_CATEGORIES[n.categorie] }} />
                {n.titre}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const Noeud = memo(function Noeud({ id, data, selected }: NodeProps<NoeudRF>) {
  const d = defNoeud(data.type)!
  const ctx = useContext(CtxEditeur)!
  const entrees = d.entreesVisibles ? d.entrees.filter((e) => d.entreesVisibles!(data.params).includes(e.nom)) : d.entrees
  const sorties = d.sortiesVisibles ? d.sorties.filter((s) => d.sortiesVisibles!(data.params).includes(s.nom)) : d.sorties
  return (
    <div className={`w-44 overflow-visible rounded-md border bg-surface-2 text-[11px] shadow-md ${selected ? 'border-accent' : 'border-bord'}`}>
      <div className="rounded-t-[5px] px-2 py-1 font-semibold text-white" style={{ background: COULEURS_CATEGORIES[d.categorie] }}>
        {d.titre}
      </div>
      <div className="space-y-1 py-1.5">
        {sorties.map((s) => (
          <div key={s.nom} className="relative flex justify-end px-3">
            <span>{s.nom}</span>
            <Handle type="source" position={Position.Right} id={`s:${s.nom}`} className="socket" style={{ background: couleurSocket(s.type) }} />
          </div>
        ))}
        {d.params?.map((p) => (
          <div key={p.nom} className="nodrag px-2">
            {p.type === 'choix' && (
              <select
                className="w-full rounded border border-bord bg-fond px-1 py-0.5"
                value={String(data.params[p.nom])}
                onChange={(e) => ctx.maj(id, { params: { ...data.params, [p.nom]: e.target.value } })}
                aria-label={p.nom}
              >
                {p.options.map((o) => (
                  <option key={o.valeur} value={o.valeur}>
                    {o.libelle}
                  </option>
                ))}
              </select>
            )}
            {p.type === 'nombre' && (
              <ChampNode valeur={Number(data.params[p.nom])} pas={p.pas} onChange={(x) => ctx.maj(id, { params: { ...data.params, [p.nom]: x } })} libelle="Valeur" />
            )}
            {p.type === 'couleur' && (
              <input
                type="color"
                className="h-5 w-full cursor-pointer rounded border border-bord bg-transparent"
                value={String(data.params[p.nom])}
                onChange={(e) => ctx.maj(id, { params: { ...data.params, [p.nom]: e.target.value } })}
                aria-label="Couleur"
              />
            )}
          </div>
        ))}
        {entrees.map((s) => {
          const branchee = ctx.branchees.has(`${id}:e:${s.nom}`)
          const v = data.valeurs[s.nom] ?? s.defaut
          return (
            <div key={s.nom} className="relative px-3">
              <Handle type="target" position={Position.Left} id={`e:${s.nom}`} className="socket" style={{ background: couleurSocket(s.type) }} />
              {branchee || v === undefined ? (
                <span>{s.nom}</span>
              ) : s.type === 'float' ? (
                <ChampNode valeur={v as number} libelle={s.nom} onChange={(x) => ctx.maj(id, { valeurs: { ...data.valeurs, [s.nom]: x } })} />
              ) : s.type === 'couleur' ? (
                <label className="nodrag flex items-center justify-between gap-2">
                  <span>{s.nom}</span>
                  <input
                    type="color"
                    className="h-4 w-10 cursor-pointer rounded border border-bord bg-transparent"
                    value={versHex(v as Vec3)}
                    onChange={(e) => ctx.maj(id, { valeurs: { ...data.valeurs, [s.nom]: depuisHex(e.target.value) } })}
                  />
                </label>
              ) : (
                <div className="nodrag">
                  <span>{s.nom}</span>
                  <div className="mt-0.5 grid grid-cols-3 gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <ChampNode
                        key={i}
                        valeur={(v as Vec3)[i]}
                        compact
                        libelle={`${s.nom} ${'xyz'[i]}`}
                        onChange={(x) => {
                          const n = [...(v as Vec3)] as Vec3
                          n[i] = x
                          ctx.maj(id, { valeurs: { ...data.valeurs, [s.nom]: n } })
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

const TYPES = { noeud: Noeud }

/** Champ numérique de node : glisser horizontalement pour changer la valeur, ou taper. */
function ChampNode({ valeur, onChange, libelle, pas = 0.05, compact }: { valeur: number; onChange: (x: number) => void; libelle: string; pas?: number; compact?: boolean }) {
  const [saisie, setSaisie] = useState<string | null>(null)
  const valider = () => {
    if (saisie !== null) {
      const x = Number(saisie.replace(',', '.'))
      if (Number.isFinite(x)) onChange(x)
    }
    setSaisie(null)
  }
  return (
    <label className="nodrag flex items-center justify-between gap-1 rounded bg-fond px-1.5 py-0.5">
      {!compact && <span className="truncate text-doux">{libelle}</span>}
      <input
        aria-label={libelle}
        className={`min-w-0 bg-transparent text-right font-mono tabular-nums outline-none ${compact ? 'w-full text-center' : 'w-12'}`}
        value={saisie ?? String(Math.round(valeur * 1000) / 1000)}
        onChange={(e) => setSaisie(e.target.value)}
        onBlur={valider}
        onKeyDown={(e) => {
          if (e.key === 'Enter') valider()
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            onChange(Math.round((valeur + (e.key === 'ArrowUp' ? pas : -pas)) * 1e4) / 1e4)
          }
        }}
      />
    </label>
  )
}

const versHex = (v: Vec3) => `#${v.map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0')).join('')}`
const depuisHex = (h: string): Vec3 => {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((x) => Math.round(x * 1000) / 1000) as Vec3
}

export type { Graphe, NoeudGraphe }
