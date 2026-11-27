import { useCallback, useEffect, useState } from 'react'

/**
 * Concepts vus, gardés dans le navigateur en attendant la synchronisation avec l'API (étape 5).
 * Lecture après le montage seulement, pour que le HTML pré-rendu et l'hydratation concordent.
 */
const CLE = '3datr-vus'
const EVENEMENT = '3datr-vus'

function lire(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? '[]')
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

export function marquerVu(slug: string) {
  const vus = lire()
  if (vus.includes(slug)) return
  try {
    localStorage.setItem(CLE, JSON.stringify([...vus, slug]))
    window.dispatchEvent(new Event(EVENEMENT))
  } catch {
    /* stockage indisponible : tant pis */
  }
}

export function useVus(): Set<string> | null {
  const [vus, setVus] = useState<Set<string> | null>(null)
  const maj = useCallback(() => setVus(new Set(lire())), [])
  useEffect(() => {
    maj()
    window.addEventListener(EVENEMENT, maj)
    window.addEventListener('storage', maj)
    return () => {
      window.removeEventListener(EVENEMENT, maj)
      window.removeEventListener('storage', maj)
    }
  }, [maj])
  return vus
}

/** Petite préférence partagée entre les pages (ex. logiciel préféré pour les onglets). */
export function usePreference<T extends string>(cle: string, defaut: T): [T, (v: T) => void] {
  const [valeur, setValeur] = useState<T>(defaut)
  useEffect(() => {
    try {
      const v = localStorage.getItem(cle)
      if (v) setValeur(v as T)
    } catch {
      /* rien */
    }
    const ecouter = (e: Event) => setValeur((e as CustomEvent<T>).detail)
    window.addEventListener(`pref:${cle}`, ecouter)
    return () => window.removeEventListener(`pref:${cle}`, ecouter)
  }, [cle])
  const changer = useCallback(
    (v: T) => {
      setValeur(v)
      try {
        localStorage.setItem(cle, v)
      } catch {
        /* rien */
      }
      window.dispatchEvent(new CustomEvent(`pref:${cle}`, { detail: v }))
    },
    [cle],
  )
  return [valeur, changer]
}
