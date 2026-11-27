export const URL_SITE = 'https://3datr.manticore-studio.fr'

export function metaPage({ titre, description, chemin, indexer = true }: { titre: string; description: string; chemin: string; indexer?: boolean }) {
  return [
    { title: `${titre} · 3DATR` },
    { name: 'description', content: description },
    { property: 'og:title', content: titre },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'article' },
    { property: 'og:url', content: `${URL_SITE}${chemin}` },
    { tagName: 'link', rel: 'canonical', href: `${URL_SITE}${chemin}` },
    ...(indexer ? [] : [{ name: 'robots', content: 'noindex' }]),
  ]
}
