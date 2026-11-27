# Contenu de 3DATR

Tout le contenu du site vit ici, dans Git. MongoDB n'en garde qu'une copie indexée.

```
domaines.yaml                   les 13 domaines : slug, titre, couleur (ordre = ordre du fichier)
chapitres.yaml                  les chapitres de chaque domaine, dans l'ordre
parcours/<slug>.yaml            parcours guidés : liste ordonnée de slugs
concepts/<domaine>/<slug>.mdx   une fiche par concept : en-tête YAML + texte MDX
```

## En-tête d'un concept

Le schéma fait foi : `packages/core/src/schema.ts` (Zod). Un champ inconnu est refusé.

```yaml
---
slug: produit-scalaire              # = nom du fichier, minuscules et tirets
titre: Produit scalaire (Dot Product)
statut: brouillon                   # brouillon | publie
domaine: vecteurs                   # = nom du dossier, doit exister dans domaines.yaml
chapitre: operations-vectorielles   # doit appartenir au domaine dans chapitres.yaml
ordre: 1                            # position dans le chapitre
niveau: moyen                       # facile | moyen | difficile
logiciels: [gn, blender-shader, unreal-material, code]
nodes: [Vector Math > Dot Product, DotProduct]
usages: [materiaux, stylise, vfx]   # materiaux, terrain, scatter, vfx, stylise, hard-surface, animation, ui-technique
nature: fondamental                 # fondamental | technique | recette
resume: Mesure à quel point deux directions pointent dans le même sens.
description: >
  150 à 300 mots en langage courant : ce que fait le concept, à quoi il sert,
  ce qu'on voit à l'écran, les effets où il intervient. Sert à la recherche floue.
questions:                          # 5 à 10 phrases telles qu'un artiste les taperait
  - neige seulement sur le dessus des objets
synonymes: [dot, N dot L, DotProduct]
effets: [neige sur le dessus, ombrage, liseré]
prerequis: [point-vecteur, normalisation]
suites: [produit-vectoriel, fresnel, lambert]
alternatives: []
module: DotProductPlayground        # composant dans apps/web/src/modules/
idee_module: Deux flèches orientables, jauge de −1 à 1   # en attendant le module
temps: 10                           # minutes, optionnel
---
```

Un **brouillon** n'exige que l'identité (slug, titre, domaine, chapitre, niveau, logiciels).
Pour passer en **publie**, il faut en plus : `resume`, une `description` de 150 à 300 mots,
5 à 10 `questions`, au moins un `synonyme` et un `module` enregistré.

## Corps du texte : les sections de la page

Toutes les pages concept suivent le même ordre de 9 sections. Trois sont générées par le
gabarit (en-tête, module interactif, « Pour aller plus loin »). Les six autres s'écrivent
dans le corps MDX, chacune sous un titre `##` exact, dans cet ordre :

| Titre dans le MDX | Contenu attendu |
| --- | --- |
| `## Intuition` | deux ou trois phrases et une analogie visuelle, sans formule |
| `## La formule` | la formule KaTeX, chaque variable dans la couleur de son curseur (optionnelle) |
| `## Dans tes logiciels` | un onglet par logiciel : nom exact du node, node tree minimal, extrait de code |
| `## Recettes` | deux ou trois usages concrets en production (titres `###`) |
| `## Pièges courants` | erreurs fréquentes et comment les reconnaître |
| `## Mini-défi` | un objectif à atteindre dans le module (optionnelle) |

Le texte commence directement par `## Intuition`. Un titre inconnu, un doublon ou un désordre
bloque la validation. Une section absente d'un brouillon s'affiche « à rédiger ».
Exemple complet : `apps/web/src/exemple/produit-scalaire.mdx`, visible sur `/gabarit`.

Ce qu'on peut écrire dans le texte :

- **Formules** : `$…$` dans la ligne, `$$…$$` en bloc. `\col{rouge}{a}` colore une variable
  (rouge, orange, jaune, vert, bleu, violet, rose), avec la même teinte que le curseur du module.
- **Liens** : `[[slug]]` ou `[[slug|texte]]`, avec pastille du domaine et bulle de résumé.
- **Onglets logiciels** :

  ```mdx
  <Logiciels>
  <Logiciel id="gn" node="Vector Math › Dot Product">

  Texte, schéma, code…

  </Logiciel>
  <Logiciel id="code">…</Logiciel>
  </Logiciels>
  ```

  `id` : `gn`, `blender-shader`, `unreal-material` ou `code`. L'onglet choisi est mémorisé d'une page à l'autre.
- **Node tree** : `<NodeTree nodes={[…]} liens={['a.Sortie > b.Entrée']} legende="…" />`, voir
  `apps/web/src/concept/NodeTree.tsx` pour le format des nodes et des sockets.
- **Code** : blocs ```` ```glsl ````, `hlsl`, `python`, `csharp`, `cpp`, `typescript`… colorés au build.
- **Encadré** : `<Encadre type="astuce|attention|info" titre="…">…</Encadre>`.

Attention, c'est du MDX : `{` et `<` dans le texte ordinaire s'écrivent `\{` et `&lt;`.

## Liens entre concepts

| Type | Où l'écrire | Sur la carte |
| --- | --- | --- |
| prérequis | `prerequis:` | flèche pleine |
| suite | `suites:` (les suites déduites des prérequis sont calculées seules) | flèche pleine, sens inverse |
| alternative | `alternatives:` (d'un seul côté suffit, le lien est symétrique) | trait double |
| cité | `[[slug]]` ou `[[slug\|texte]]` dans le texte | pointillé |

## Vérifications

`pnpm contenu:valider` (lancé aussi par la CI et par le build) bloque si :

- un en-tête ne respecte pas le schéma, ou le fichier est mal nommé ou mal rangé ;
- un slug cité (prérequis, suites, alternatives, `[[…]]`, parcours) n'existe pas ;
- les prérequis et suites forment une boucle ;
- les sections `##` du texte sont inconnues, en double ou dans le désordre ;
- le `module` déclaré n'existe pas dans `apps/web/src/modules/` (`<Nom>.tsx` ou `<Nom>/index.tsx`) ;
- un concept `publie` n'a pas ses champs de recherche ou son module.

Il signale sans bloquer les concepts isolés, les chapitres vides et les parcours
qui présentent un concept avant son prérequis.

## Compilation

`pnpm contenu:compiler` écrit dans `apps/web/public/data/` (fichiers générés, non versionnés) :

- `catalog.json` : domaines avec chapitres, parcours, et chaque concept avec son en-tête,
  son empreinte, ses rétroliens (`citePar`), ses suites déduites (`requisPar`) et ses alternatives
  dans les deux sens ;
- `graph.json` : nœuds avec position (x, y) et poids, centres des domaines, liens typés
  dédoublonnés. Les positions sont calculées au build par d3-force de façon déterministe :
  la carte ne bouge pas tant que le contenu ne change pas.
