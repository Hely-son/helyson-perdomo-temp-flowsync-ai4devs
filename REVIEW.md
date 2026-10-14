# REVIEW.md — calibración del revisor

Solo para revisiones de código. El árbitro son los scenarios de `openspec/specs/<capability>/spec.md`;
las convenciones están en `CLAUDE.md`.

## Grave: se reporta siempre

- Rompe un scenario de la spec. Cita el scenario y da la entrada concreta que lo rompe.
- Expone datos de una cuenta que la spec no permite exponer (p. ej. el email del responsable).
- Se salta la autenticación: una ruta que debería pedir token y no lo pide.
- Pierde o altera datos que no tocaban (p. ej. una petición borra un campo que no venía a cambiar).
- Un 2xx donde la spec exige un 4xx, o al revés.
- Un comentario o doc del repo que afirma un comportamiento que el código no tiene.

## Sugerencia: todo lo demás

Nombres, estructura, duplicación, legibilidad, tests que faltan para código no tocado, rendimiento sin
un caso medible. **Máximo 5 sugerencias por revisión**, las de más valor. El resto, una línea contada:
«y N sugerencias menores más».

## Dónde no reportar

- Formato, lint y tipos: ya los vigilan Prettier (hook en `frontend/`, `npm run format`), `eslint`,
  `oxlint`, `npm run typecheck` y `npm run build`.
- Que `docs/api/openapi.json` no coincida con el código: lo vigila `npm run openapi:check`.
- Código generado: `backend/database/schema.ts`, `backend/.adonisjs/`, `frontend/src/components/ui/`.
- Lockfiles, `tmp/` y bases de datos SQLite.
- Gustos sin consecuencia: si no puedes decir qué se rompe, no es un hallazgo.

## Evidencia

Cada afirmación sobre cómo se comporta el código lleva `archivo:línea` de donde lo has leído. No lo
deduzcas del nombre de una función, de un comentario ni de un test: el comentario puede mentir y el
test puede no existir. Lo que no hayas podido leer o ejecutar se marca **no verificado**, o no se
afirma.
