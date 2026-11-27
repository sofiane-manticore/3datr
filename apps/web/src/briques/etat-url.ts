import type { Vec3 } from './math'
import { clamp } from './math'
import type { DefVariable, DefVariables, Valeurs } from './types'

/**
 * État d'un module dans l'URL : une clé par variable modifiée, lisible et partageable.
 *   ?a=1,0,0&b=0.7,0.7,0&mode=clamp
 * Seules les valeurs différentes du défaut sont écrites ; une valeur illisible est ignorée.
 */

const nombre = (x: number) => String(Math.round(x * 10000) / 10000)

export function encoderValeur(def: DefVariable, v: unknown): string {
  switch (def.type) {
    case 'nombre':
      return nombre(v as number)
    case 'vec3':
      return (v as Vec3).map(nombre).join(',')
    case 'booleen':
      return v ? '1' : '0'
    case 'couleur':
      return String(v).replace(/^#/, '')
    case 'choix':
    case 'texte':
      return String(v)
    case 'libre':
      return encoderJson(v)
  }
}

export function decoderValeur(def: DefVariable, brut: string): unknown {
  switch (def.type) {
    case 'nombre': {
      const x = Number(brut)
      return brut.trim() !== '' && Number.isFinite(x) ? clamp(x, def.min, def.max) : undefined
    }
    case 'vec3': {
      const p = brut.split(',').map(Number)
      if (p.length !== 3 || p.some((x) => !Number.isFinite(x))) return undefined
      return p.map((x) => clamp(x, def.min ?? -Infinity, def.max ?? Infinity)) as Vec3
    }
    case 'booleen':
      return brut === '1' ? true : brut === '0' ? false : undefined
    case 'couleur':
      return /^[0-9a-f]{6}$/i.test(brut) ? `#${brut.toLowerCase()}` : undefined
    case 'choix':
      return def.options.some((o) => o.valeur === brut) ? brut : undefined
    case 'texte':
      return brut
    case 'libre':
      return decoderJson(brut)
  }
}

const egal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Valeurs de départ : défauts, puis ce que l'URL apporte. */
export function lireEtat<V extends DefVariables>(variables: V, params: URLSearchParams): Valeurs<V> {
  const v = defauts(variables)
  for (const [nom, def] of Object.entries(variables)) {
    if (!dansUrl(def)) continue
    const brut = params.get(nom)
    if (brut === null) continue
    const d = decoderValeur(def, brut)
    if (d !== undefined) (v as Record<string, unknown>)[nom] = d
  }
  return v
}

/** Écrit les valeurs dans les paramètres (en gardant les paramètres étrangers au module). */
export function ecrireEtat<V extends DefVariables>(variables: V, valeurs: Valeurs<V>, params: URLSearchParams): URLSearchParams {
  const p = new URLSearchParams(params)
  for (const [nom, def] of Object.entries(variables)) {
    if (!dansUrl(def)) continue
    const val = (valeurs as Record<string, unknown>)[nom]
    if (egal(val, def.defaut)) p.delete(nom)
    else p.set(nom, encoderValeur(def, val))
  }
  return p
}

export function defauts<V extends DefVariables>(variables: V): Valeurs<V> {
  const v: Record<string, unknown> = {}
  for (const [nom, def] of Object.entries(variables)) v[nom] = structuredClone(def.defaut)
  return v as Valeurs<V>
}

export const dansUrl = (def: DefVariable) => def.dansUrl ?? def.type !== 'libre'

function encoderJson(v: unknown) {
  const octets = new TextEncoder().encode(JSON.stringify(v))
  let s = ''
  for (const o of octets) s += String.fromCharCode(o)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decoderJson(brut: string) {
  try {
    const s = atob(brut.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0))))
  } catch {
    return undefined
  }
}
