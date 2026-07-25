# Flujo de trabajo Git

## Ramas

| Rama | Propósito | Recibe de | Entrega a |
|------|-----------|-----------|-----------|
| `master` | Producción estable | `develop`, `hotfix/*` | — |
| `develop` | Integración de features | `feature/*` | `master` |
| `feature/*` | Funcionalidad específica | `develop` | `develop` |
| `hotfix/*` | Fix urgente de producción | `master` | `master` + `develop` |

## Nueva feature

```
git checkout develop
git checkout -b feature/nombre-descriptivo
# ... desarrollo ...
git add -A && git commit -m "feat: descripción"
git checkout develop
git merge --no-ff feature/nombre-descriptivo
git branch -d feature/nombre-descriptivo
git push
```

## Hotfix (fix urgente)

```
git checkout master
git checkout -b hotfix/nombre-fix
# ... fix ...
git add -A && git commit -m "fix: descripción"
git checkout master
git merge --no-ff hotfix/nombre-fix
git checkout develop
git merge --no-ff hotfix-fix     # propagar a develop
git branch -d hotfix/nombre-fix
git push
```

## Release a producción

```
git checkout develop
git merge --no-ff master         # sincronizar con prod
git checkout master
git merge --no-ff develop
git tag -a vX.Y -m "mensaje"
git push --tags
```

## Reglas

- `master` **nunca** recibe commits directos
- Siempre `--no-ff` al merges para mantener historial claro
- Nombres descriptivos: `feature/compartido-solo-gastos`, `hotfix/timezone-utc`
- Tags en `master` marcan versiones de producción
