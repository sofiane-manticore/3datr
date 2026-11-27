import type { ReactNode } from 'react'
import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse } from 'react-router'
import type { Route } from './+types/root'
import { BoutonTheme, SCRIPT_THEME } from './composants/theme'
import './styles.css'

export const meta: Route.MetaFunction = () => [
  { title: '3DATR · 3D Artist Tools Reminder' },
  {
    name: 'description',
    content: 'Comprendre les maths et les techniques des artistes 3D, avec un module interactif pour chaque concept.',
  },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" data-theme="sombre" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark light" />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
        <Meta />
        <Links />
      </head>
      <body>
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
          Aller au contenu
        </a>
        <header className="sticky top-0 z-30 border-b border-bord bg-fond/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
            <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <Logo />
              <span>3DATR</span>
            </Link>
            <nav className="ml-auto flex items-center gap-1 text-sm text-doux">
              <Link to="/" className="rounded px-2 py-1 hover:bg-surface hover:text-texte">
                Concepts
              </Link>
              <BoutonTheme />
            </nav>
          </div>
        </header>
        <div id="contenu">{children}</div>
        <footer className="mt-24 border-t border-bord">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-doux">
            3DATR · 3D Artist Tools Reminder · les maths et techniques des artistes 3D, un module interactif par concept.
          </div>
        </footer>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <path d="M12 2 21 7v10l-9 5-9-5V7z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 12 21 7M12 12 3 7M12 12v10" stroke="var(--accent)" strokeWidth="1.6" />
    </svg>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const introuvable = isRouteErrorResponse(error) && error.status === 404
  return (
    <main className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-3xl font-semibold">{introuvable ? 'Page introuvable' : 'Une erreur est survenue'}</h1>
      <p className="mt-4 text-doux">
        {introuvable
          ? "Ce concept n'existe pas, ou pas encore."
          : 'Recharge la page. Si le problème continue, signale-le.'}
      </p>
      <Link to="/" className="mt-8 inline-block text-accent underline underline-offset-4">
        Revenir aux concepts
      </Link>
    </main>
  )
}
