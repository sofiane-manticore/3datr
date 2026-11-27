#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chargerContenu } from './charger.js'
import { compilerContenu } from './compiler.js'
import { registreModulesDossier, validerContenu, type Probleme } from './valider.js'

const racineRepo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    contenu: { type: 'string', default: join(racineRepo, 'content') },
    modules: { type: 'string', default: join(racineRepo, 'apps/web/src/modules') },
    sortie: { type: 'string', default: join(racineRepo, 'apps/web/public/data') },
    strict: { type: 'boolean', default: false },
  },
})
const commande = positionals[0] ?? 'valider'
if (!['valider', 'compiler'].includes(commande)) {
  console.error(`Commande inconnue « ${commande} ». Utilisation : 3datr-content <valider|compiler> [--strict]`)
  process.exit(2)
}

const afficher = (titre: string, liste: Probleme[]) => {
  if (!liste.length) return
  console.log(`\n${titre} (${liste.length})`)
  for (const p of liste) console.log(`  ${p.fichier} : ${p.message}`)
}

const brut = chargerContenu(values.contenu!)
const { erreurs, avertissements, contenu } = validerContenu(brut, {
  moduleExiste: registreModulesDossier(values.modules!),
})

afficher('Avertissements', avertissements)
afficher('Erreurs', erreurs)

const parStatut = contenu.concepts.reduce<Record<string, number>>((acc, c) => {
  acc[c.statut] = (acc[c.statut] ?? 0) + 1
  return acc
}, {})
console.log(
  `\n${contenu.concepts.length} concepts (${Object.entries(parStatut)
    .map(([s, n]) => `${n} ${s}`)
    .join(', ')}), ${contenu.domaines.length} domaines, ${contenu.parcours.length} parcours.`,
)

if (erreurs.length || (values.strict && avertissements.length)) {
  console.error(`\nContenu invalide : ${erreurs.length} erreur(s)${values.strict ? `, ${avertissements.length} avertissement(s) en mode strict` : ''}.`)
  process.exit(1)
}

if (commande === 'compiler') {
  const { catalogue, graphe } = compilerContenu(contenu)
  mkdirSync(values.sortie!, { recursive: true })
  writeFileSync(join(values.sortie!, 'catalog.json'), JSON.stringify(catalogue))
  writeFileSync(join(values.sortie!, 'graph.json'), JSON.stringify(graphe))
  const rel = relative(process.cwd(), values.sortie!) || '.'
  console.log(`catalog.json et graph.json écrits dans ${rel} (${graphe.liens.length} liens, empreinte ${catalogue.hash}).`)
} else {
  console.log('Contenu valide.')
}
