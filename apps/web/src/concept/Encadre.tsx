import type { ReactNode } from 'react'

const STYLES = {
  astuce: { couleur: 'var(--v-vert)', titre: 'Astuce' },
  attention: { couleur: 'var(--attention)', titre: 'Attention' },
  info: { couleur: 'var(--accent)', titre: 'À savoir' },
} as const

/** Encadré dans le texte : <Encadre type="astuce" titre="…">…</Encadre> */
export function Encadre({ type = 'info', titre, children }: { type?: keyof typeof STYLES; titre?: string; children?: ReactNode }) {
  const s = STYLES[type] ?? STYLES.info
  return (
    <aside className="rounded-lg border border-bord bg-surface p-4" style={{ borderLeft: `3px solid ${s.couleur}` }}>
      <p className="text-sm font-semibold" style={{ color: s.couleur }}>
        {titre ?? s.titre}
      </p>
      <div className="mt-1 [&>*+*]:mt-2">{children}</div>
    </aside>
  )
}
