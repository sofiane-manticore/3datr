import { useEffect, useState } from 'react'

const CLE = '3datr-theme'
type Theme = 'sombre' | 'clair'

/** Exécuté dans <head> avant l'affichage : évite un flash de thème clair ou sombre. */
export const SCRIPT_THEME = `try{var t=localStorage.getItem('${CLE}');if(t==='clair'||t==='sombre')document.documentElement.dataset.theme=t}catch(e){}`

export function BoutonTheme() {
  const [theme, setTheme] = useState<Theme>('sombre')
  useEffect(() => setTheme((document.documentElement.dataset.theme as Theme) ?? 'sombre'), [])
  const basculer = () => {
    const t: Theme = theme === 'sombre' ? 'clair' : 'sombre'
    document.documentElement.dataset.theme = t
    try {
      localStorage.setItem(CLE, t)
    } catch {
      /* rien */
    }
    setTheme(t)
  }
  return (
    <button
      type="button"
      onClick={basculer}
      className="rounded p-2 hover:bg-surface hover:text-texte"
      aria-label={theme === 'sombre' ? 'Passer au thème clair' : 'Passer au thème sombre'}
      title={theme === 'sombre' ? 'Thème clair' : 'Thème sombre'}
    >
      {theme === 'sombre' ? (
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" fill="currentColor" />
        </svg>
      )}
    </button>
  )
}
