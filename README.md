# 3DATR · 3D Artist Tools Reminder

Site qui aide les artistes 3D à comprendre les concepts mathématiques et les techniques derrière Geometry Nodes, le Shader Editor de Blender, les matériaux Unreal et la programmation. Chaque concept est accompagné d'un module interactif.

En ligne : https://3datr.manticore-studio.fr

## Structure

```
apps/web        front React (Vite, TypeScript)
apps/api        API Fastify, sert aussi apps/web/dist
content/        concepts MDX, domaines, parcours
packages/       code partagé (types, schémas, modules)
scripts/        scripts serveur (sync-content, embed…)
```

## Développement

```
pnpm install
pnpm dev          # web sur :5173, API sur :3000
```

Variables d'environnement de l'API : `MONGO_URL`, `MONGO_DB` (défaut `3datr`), `PORT` (défaut 3000).

## Déploiement

Dokploy construit le `Dockerfile` à chaque push sur `main` et publie sur 3datr.manticore-studio.fr.
