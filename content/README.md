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
