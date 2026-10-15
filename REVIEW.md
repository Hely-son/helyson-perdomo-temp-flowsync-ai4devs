# Instrucciones de revisión

Solo para revisar PRs de FlowSync. Si algo de aquí choca con otra guía, manda esto.

## Grave: se reporta siempre

- Rompe un scenario de `openspec/specs/`. Cita el requisito y el scenario.
- Expone datos de la cuenta que la spec no permite (p. ej. el email del responsable de una tarea).
- Una ruta que debía pedir sesión deja de pedirla, o un controlador devuelve un modelo sin pasar
  por un transformer.
- Se edita a mano algo generado: `backend/database/schema.ts`, `backend/.adonisjs/`,
  `frontend/src/components/ui/`.
- Un test se afloja, se borra o se salta para que pase, en vez de arreglar el código.
- Cambian rutas, controladores, validadores o transformers de una capability y no cambia su
  `docs/capabilities/<nombre>/README.md`.

Todo lo demás es **sugerencia**: nombres, legibilidad, duplicación, rendimiento sin un caso real,
tests que faltan para código que no cambia.

## Tope de sugerencias

Como mucho **5** sugerencias por revisión, las de más valor. El resto, contadas en una línea del
comentario final («y 7 más de nombres y formato»), sin detallarlas.

## Dónde no reportar

- Formato y estilo: los deciden Prettier, ESLint (backend) y oxlint (frontend).
- Si `docs/api/openapi.json` está al día: lo vigila el job `openapi-check` en cada PR.
- Archivos generados (`schema.ts`, `.adonisjs/`, `docs/api/openapi.json`, `package-lock.json`)
  salvo para el caso grave de arriba.
- Incumplimientos ya admitidos en un README de capability, si el PR no los toca ni los empeora.
- Decisiones registradas en `docs/adr/`: no se reabren en una revisión.
- Código que el PR no modifica.

## Evidencia

Para afirmar que algo se comporta de una manera, cita el `archivo:línea` donde lo has leído. Ni el
nombre de una función ni su comentario son evidencia: `isOverdueOn` no prueba que mire el estado,
y un comentario que dice «tres condiciones» no prueba que el código las compruebe. Si no lo has
podido leer, no lo reportes como hecho.
