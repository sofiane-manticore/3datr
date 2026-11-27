import type { ReactNode } from 'react'

/**
 * Coloration syntaxique minimale (mots-clés, nombres, chaînes, commentaires) pour le code
 * des modules, sans charger Shiki dans le navigateur. Langages : python, glsl, js.
 */
export type Langage = 'python' | 'glsl' | 'js'

const MOTS: Record<Langage, string[]> = {
  python: ['def', 'return', 'for', 'in', 'range', 'if', 'elif', 'else', 'while', 'import', 'from', 'as', 'and', 'or', 'not', 'True', 'False', 'None', 'print', 'len'],
  glsl: ['void', 'float', 'int', 'bool', 'vec2', 'vec3', 'vec4', 'mat3', 'mat4', 'uniform', 'varying', 'return', 'if', 'else', 'for', 'const', 'in', 'out'],
  js: ['const', 'let', 'var', 'function', 'return', 'for', 'of', 'in', 'if', 'else', 'while', 'true', 'false', 'null'],
}
const FONCTIONS_GLSL = ['sin', 'cos', 'mix', 'step', 'smoothstep', 'fract', 'floor', 'abs', 'dot', 'cross', 'normalize', 'length', 'clamp', 'pow', 'min', 'max', 'mod']

export function colorerLigne(ligne: string, langage: Langage): ReactNode[] {
  const commentaire = langage === 'python' ? '#' : '//'
  const re = new RegExp(`(${commentaire === '#' ? '#' : '\\/\\/'}.*$)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|(\\b\\d+(?:\\.\\d*)?\\b)|([A-Za-z_]\\w*)`, 'g')
  const out: ReactNode[] = []
  let dernier = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(ligne))) {
    if (m.index > dernier) out.push(ligne.slice(dernier, m.index))
    const [t] = m
    const cls = m[1] ? 'text-doux italic' : m[2] ? 'text-[var(--v-vert)]' : m[3] ? 'text-[var(--v-orange)]' : MOTS[langage].includes(t) ? 'text-[var(--v-violet)]' : langage === 'glsl' && FONCTIONS_GLSL.includes(t) ? 'text-[var(--v-bleu)]' : ''
    out.push(cls ? <span key={k++} className={cls}>{t}</span> : t)
    dernier = m.index + t.length
  }
  if (dernier < ligne.length) out.push(ligne.slice(dernier))
  return out
}

/** Code en lecture seule avec numéros de ligne, ligne active et lignes marquées (erreurs). */
export function CodeAnnote({ code, langage, active, marquees = [] }: { code: string; langage: Langage; active?: number; marquees?: number[] }) {
  return (
    <pre className="m-0 font-mono text-[12.5px] leading-[1.6]" aria-label="Code">
      {code.split('\n').map((l, i) => (
        <div
          key={i}
          className={`flex ${i + 1 === active ? 'bg-accent/15 shadow-[inset_2px_0_0_var(--accent)]' : marquees.includes(i + 1) ? 'bg-[var(--v-rouge)]/10' : ''}`}
          aria-current={i + 1 === active ? 'step' : undefined}
        >
          <span className="w-9 shrink-0 pr-3 text-right text-doux/60 select-none">{i + 1}</span>
          <span className="pr-3 whitespace-pre">{colorerLigne(l, langage)}</span>
        </div>
      ))}
    </pre>
  )
}

/** Éditeur de code léger : zone de texte superposée au code coloré, mêmes métriques. */
export function EditeurCode({ code, onChange, langage, marquees = [] }: { code: string; onChange: (c: string) => void; langage: Langage; marquees?: number[] }) {
  return (
    <div className="relative min-h-full">
      <div aria-hidden="true">
        <CodeAnnote code={code + '\n'} langage={langage} marquees={marquees} />
      </div>
      <textarea
        value={code}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-label="Code du shader"
        className="absolute inset-0 resize-none overflow-hidden bg-transparent pl-9 font-mono text-[12.5px] leading-[1.6] whitespace-pre text-transparent caret-[var(--texte)] outline-none focus-visible:outline-none"
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return
          e.preventDefault()
          const t = e.currentTarget
          const { selectionStart: a, selectionEnd: b } = t
          onChange(code.slice(0, a) + '  ' + code.slice(b))
          requestAnimationFrame(() => t.setSelectionRange(a + 2, a + 2))
        }}
      />
    </div>
  )
}
