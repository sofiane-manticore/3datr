/** Texte brut d'un nœud mdast ou hast (sans dépendance). */
export function texteDe(n: unknown): string {
  const node = n as { value?: unknown; children?: unknown[] }
  if (typeof node.value === 'string') return node.value
  return (node.children ?? []).map(texteDe).join('')
}
