declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const Contenu: ComponentType<{ components?: Record<string, unknown> }>
  export default Contenu
}
