import { describe, expect, it } from 'vitest'
import { decoderValeur, defauts, ecrireEtat, encoderValeur, lireEtat } from '../src/briques/etat-url'
import { angle, cross, dot, mapRange, smoothstep } from '../src/briques/math'
import { compiler, creeCycle, normaliser, type Graphe } from '../src/briques/nodes/bibliotheque'
import { changees, tracer } from '../src/briques/pas-a-pas/trace'
import { lireErreurs, fragmentComplet } from '../src/briques/shader/glsl'
import type { DefVariables } from '../src/briques/types'

const VARS = {
  a: { type: 'vec3', defaut: [1, 0, 0], libelle: 'a', min: -2, max: 2 },
  t: { type: 'nombre', defaut: 0.5, min: 0, max: 1, libelle: 't' },
  mode: { type: 'choix', defaut: 'clamp', options: [{ valeur: 'clamp', libelle: 'Clamp' }, { valeur: 'smooth', libelle: 'Smooth' }], libelle: 'mode' },
  vu: { type: 'booleen', defaut: false, libelle: 'vu' },
  c: { type: 'couleur', defaut: '#ff0000', libelle: 'c' },
  g: { type: 'libre', defaut: { x: 1 }, libelle: 'g' },
} satisfies DefVariables

describe('état dans l’URL', () => {
  it('n’écrit que ce qui diffère du défaut', () => {
    const v = { ...defauts(VARS), t: 0.25, mode: 'smooth' as const }
    expect(ecrireEtat(VARS, v, new URLSearchParams('autre=1')).toString()).toBe('autre=1&t=0.25&mode=smooth')
  })
  it('relit une configuration partagée et ignore les valeurs illisibles', () => {
    const v = lireEtat(VARS, new URLSearchParams('a=0,1.5,-3&t=abc&mode=inconnu&vu=1&c=00ff00'))
    expect(v.a).toEqual([0, 1.5, -2]) // borné à min
    expect(v.t).toBe(0.5)
    expect(v.mode).toBe('clamp')
    expect(v.vu).toBe(true)
    expect(v.c).toBe('#00ff00')
  })
  it('fait l’aller-retour pour chaque type', () => {
    expect(decoderValeur(VARS.a, encoderValeur(VARS.a, [0.1234567, -1, 2]))).toEqual([0.1235, -1, 2])
    expect(decoderValeur(VARS.g, encoderValeur(VARS.g, { x: 2, nom: 'é' }))).toEqual({ x: 2, nom: 'é' })
  })
  it('garde les valeurs libres hors de l’URL par défaut', () => {
    const v = { ...defauts(VARS), g: { x: 9 } }
    expect(ecrireEtat(VARS, v, new URLSearchParams()).has('g')).toBe(false)
  })
})

describe('math', () => {
  it('produit scalaire, vectoriel et angle', () => {
    expect(dot([1, 0, 0], [0, 1, 0])).toBe(0)
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1])
    expect(angle([1, 0, 0], [-1, 0, 0])).toBeCloseTo(Math.PI)
  })
  it('smoothstep et map range comme Blender', () => {
    expect(smoothstep(0, 1, 0.5)).toBe(0.5)
    expect(smoothstep(0, 1, 2)).toBe(1)
    expect(mapRange(5, 0, 10, 0, 1)).toBe(0.5)
    expect(mapRange(20, 0, 10, 0, 1)).toBe(1)
    expect(mapRange(20, 0, 10, 0, 1, false)).toBe(2)
  })
})

describe('mini éditeur de nodes', () => {
  const g: Graphe = normaliser({
    noeuds: [
      { id: 'c', type: 'coord-texture', x: 0, y: 0 },
      { id: 'sep', type: 'separer', x: 0, y: 0 },
      { id: 'out', type: 'sortie', x: 0, y: 0 },
    ],
    liens: [
      { de: 'c', sortie: 'UV', vers: 'sep', entree: 'Vecteur' },
      { de: 'sep', sortie: 'X', vers: 'out', entree: 'Couleur' },
    ],
  })
  it('compile le graphe en GLSL avec conversion float → couleur', () => {
    const r = compiler(g)
    expect(r.erreur).toBeUndefined()
    expect(r.code).toContain('vec3 n_c_UV = vec3(vUv, 0.0);')
    expect(r.code).toContain('float n_sep_X = n_c_UV.x;')
    expect(r.code).toContain('gl_FragColor = vec4(clamp(vec3(n_sep_X), 0.0, 1.0), 1.0);')
  })
  it('ignore les nodes non reliés à la sortie', () => {
    const r = compiler({ ...g, noeuds: [...g.noeuds, { id: 't', type: 'temps', x: 0, y: 0 }] })
    expect(r.code).not.toContain('uTemps')
    expect(r.utiliseTemps).toBe(false)
  })
  it('utilise la valeur saisie d’une entrée non branchée', () => {
    const r = compiler(normaliser({ noeuds: [{ id: 'out', type: 'sortie', x: 0, y: 0, valeurs: { Couleur: [1, 0, 0] } }], liens: [] }))
    expect(r.code).toContain('vec3(1.0, 0.0, 0.0)')
  })
  it('refuse les boucles', () => {
    expect(creeCycle([{ de: 'a', vers: 'b' }, { de: 'b', vers: 'c' }], 'c', 'a')).toBe(true)
    expect(creeCycle([{ de: 'a', vers: 'b' }], 'a', 'c')).toBe(false)
    const boucle = normaliser({
      noeuds: [
        { id: 'm1', type: 'math', x: 0, y: 0 },
        { id: 'm2', type: 'math', x: 0, y: 0 },
        { id: 'out', type: 'sortie', x: 0, y: 0 },
      ],
      liens: [
        { de: 'm1', sortie: 'Valeur', vers: 'm2', entree: 'A' },
        { de: 'm2', sortie: 'Valeur', vers: 'm1', entree: 'A' },
        { de: 'm2', sortie: 'Valeur', vers: 'out', entree: 'Couleur' },
      ],
    })
    expect(compiler(boucle).erreur).toMatch(/boucle/)
  })
})

describe('aperçu de shader', () => {
  it('ramène les erreurs GLSL à la ligne du code du module', () => {
    const code = 'void main() {\n  gl_FragColor = vec4(x, 1.0);\n}'
    // three.js ajoute son propre préambule avant notre fragment.
    const source = `#version 300 es\nprecision highp float;\n${fragmentComplet(code, { uF: 1 })}`
    const l = source.split('\n').findIndex((x) => x.includes('vec4(x')) + 1
    const e = lireErreurs(`ERROR: 0:${l}: 'x' : undeclared identifier\n`, source)
    expect(e).toEqual([{ ligne: 2, message: '« x » : undeclared identifier' }])
  })
})

describe('exécution pas à pas', () => {
  it('enregistre chaque étape et la sortie console', () => {
    const e = tracer(function* (print) {
      let s = 0
      yield [1, { s }]
      for (let i = 0; i < 3; i++) {
        s += i
        yield [3, { s, i }]
      }
      print('fini', s)
      yield [4, { s }]
    })
    expect(e.map((x) => x.ligne)).toEqual([1, 3, 3, 3, 4])
    expect(e[3].variables).toEqual({ s: 3, i: 2 })
    expect(e[4].sortie).toEqual(['fini 3'])
    expect([...changees(e[1], e[2])]).toEqual(['s', 'i'])
  })
})
