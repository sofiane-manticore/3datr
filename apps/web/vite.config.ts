import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeShiki from '@shikijs/rehype'
import { remarkSections } from './src/mdx/remark-sections'
import { remarkLiensConcepts } from './src/mdx/remark-liens'
import { OPTIONS_KATEX } from './src/mdx/katex'

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [remarkFrontmatter, remarkMath, remarkLiensConcepts, remarkSections],
        rehypePlugins: [
          [rehypeKatex, OPTIONS_KATEX],
          [
            rehypeShiki,
            {
              themes: { light: 'github-light', dark: 'github-dark' },
              defaultColor: false,
              langs: ['glsl', 'hlsl', 'python', 'csharp', 'cpp', 'typescript', 'javascript', 'json', 'yaml'],
            },
          ],
        ],
      }),
    },
    reactRouter(),
  ],
  build: { target: 'es2022' },
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
