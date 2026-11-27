# 3DATR · 3D Artist Tools Reminder

Site qui aide les artistes 3D à comprendre les concepts mathématiques et les techniques derrière Geometry Nodes, le Shader Editor de Blender, les matériaux Unreal et la programmation. Chaque concept est accompagné d'un module interactif.

En ligne : https://3datr.manticore-studio.fr

## Structure

```
apps/web        front React (React Router 7 pré-rendu, MDX, KaTeX, Tailwind)
apps/api        API Fastify, sert aussi apps/web/dist
content/        concepts MDX, domaines, parcours
packages/core   types et schémas Zod partagés
packages/content  validation et compilation du contenu
scripts/        scripts serveur (sync-content, embed…)
```

## Développement

```
pnpm install
pnpm dev               # compile le contenu, puis web sur :5173 et API sur :3000
                       # /gabarit montre une page concept complète d'exemple
pnpm contenu:valider   # vérifie le dossier content/
pnpm test
```

Le format des fiches concept est décrit dans [content/README.md](content/README.md).

Variables d'environnement de l'API : `MONGO_URL`, `MONGO_DB` (défaut `3datr`), `PORT` (défaut 3000).

## Pages concept

`pnpm build` pré-rend une page HTML par concept (`/concepts/<slug>`), avec ses données en `.data`.
Le gabarit (9 sections, KaTeX, onglets logiciels, puces de prérequis) vit dans `apps/web/src/concept/`,
les modules interactifs dans `apps/web/src/modules/<Nom>.tsx`. L'API sert `apps/web/dist/client`.

## Déploiement

Dokploy construit le `Dockerfile` à chaque push sur `main` et publie sur 3datr.manticore-studio.fr.
