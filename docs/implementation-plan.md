# Plan de implementación

## Objetivo

Construir Kyvena incrementalmente para aprender y poder observar cada pieza del RAG,
sin introducir todavía la amplitud de NotebookLM.

## Fase 0 — Decisiones y contrato visual

Entregables:

- Alcance, flujo, arquitectura y reglas del repositorio.
- Chat y login aprobados.
- Home e ingesta aprobados.
- Decisiones técnicas abiertas registradas.

Salida: ninguna ambigüedad bloqueante para crear el esqueleto del proyecto.

## Fase 1 — Fundación

Estado: **completada**. El esqueleto Next.js, autenticación SSR y flujo bilingüe
existen localmente. Supabase está conectado, las dos migraciones están aplicadas y
no hay claves foráneas sin índice. El aislamiento RLS fue verificado con dos usuarios:
cada uno ve sólo sus filas y no puede insertar usando el `owner_id` del otro. El
propietario completó además el smoke test visible de login → Home → logout.

- Inicializar aplicación, lint, pruebas, variables de ejemplo y CI.
- Implementar tokens visuales y shell responsive de Kyvena.
- Configurar Supabase local/remoto y migraciones.
- Login, logout, middleware, solicitud de acceso y cuentas manuales.
- Crear perfiles y RLS verificable.

Criterio: un usuario autenticado entra a Home y otro usuario no puede ver sus datos.

## Fase 2 — Cuadernos y fuentes

Estado: **implementación completada; aceptación visible pendiente**. Texto pegado y
archivos TXT/MD/PDF atraviesan el mismo pipeline hasta `ready` o un error accionable.
La transferencia binaria va directamente al bucket privado para respetar el límite
de 4,5 MB de Vercel Functions; validación, extracción, chunking y embeddings siguen
en el backend de Next.js. La base remota, migraciones, asesores y contratos atómicos
fueron verificados. Falta que el propietario complete la matriz visible de
`phase-2-verification.md` antes de cambiar el estado a **completada**.

Implementado:

- CRUD inicial de cuadernos y navegación a la ingesta.
- Bucket privado, RLS y políticas de Storage por propietario.
- Entrada de texto pegado con límites centralizados, hash e idempotencia.
- Estados persistidos `pending` → `processing` → `ready` para texto pegado.
- Servicio de ingesta desacoplado, ejecutado por Server Actions de Next.js.
- Normalización y chunking determinista inicial con títulos, párrafos y solapamiento.
- Embeddings OpenRouter en lotes con prefijo `passage:`, timeout y clasificación de
  errores recuperables.
- Persistencia transaccional de chunks `halfvec(2048)`, modelo efectivo y versión de
  pipeline mediante una función `security invoker` que valida el propietario.
- Pruebas unitarias de normalización, chunking, idempotencia y contrato del proveedor.
- Subida secuencial de hasta tres TXT/MD/PDF mediante Storage privado, sin pasar el
  binario por una Vercel Function.
- Validación de nombre, extensión, tamaño, firma PDF, UTF-8 y límites de extracción.
- Extracción TXT/MD y PDF página a página; ubicaciones de chunk por sección o página.
- Rechazo accionable de PDF sin capa de texto, ya que OCR está fuera del MVP.
- Reserva atómica con límites de 10 cuadernos, 20 fuentes por cuaderno, 75 fuentes y
  50 MB de originales por usuario, más cuota diaria configurable.
- Una sola ingesta activa por usuario y recuperación de trabajos abandonados.
- Reintento de errores recuperables, reprocesamiento de fuentes listas y máximo de
  tres intentos sobre el mismo trabajo idempotente.
- Cancelación de pendientes y retirada completa mediante Storage API seguida de
  borrado en cascada de texto, trabajos, chunks y embeddings.
- Estados, errores y acciones de fuente en español e inglés.

Pendiente de aceptación:

- Completar y registrar el smoke test visible de `phase-2-verification.md`.

Criterio: cada formato aprobado llega a `ready` o a un error accionable.

## Fase 3 — Indexación

Estado: **iniciada parcialmente por el flujo de texto pegado**. El chunker, la
integración de embeddings y la persistencia vectorial ya existen para `pasted_text`;
la recuperación y su evaluación permanecen pendientes.

- Extender metadatos del chunker a páginas y secciones extraídas de archivos.
- Implementado: embeddings OpenRouter para documentos con prefijo `passage:`.
- Implementado: dimensión 2048, normalización y persistencia `halfvec(2048)`.
- Implementado: versión de pipeline y modelo efectivo por chunk.
- HNSW creado; falta implementar y probar la consulta de similitud filtrada.
- Full Text Search y búsqueda híbrida con RRF.

Criterio: preguntas de prueba recuperan el fragmento esperado y jamás cruzan usuario
o cuaderno.

## Fase 4 — Chat RAG

- Conversaciones y mensajes persistentes.
- Proveedor LLM desacoplado y OpenRouter como primera implementación.
- Integrar `openai/gpt-oss-120b:free` y un único fallback
  `openai/gpt-oss-20b:free`, con clasificación explícita de errores.
- Context builder, abstención y citas estructuradas.
- Streaming sólo si no complica trazabilidad; de lo contrario, respuesta completa.
- UI aprobada: evidencia, copiar, regenerar, editar, detener y valorar.

Criterio: respuesta citada, historial recuperable y fallos de proveedor comprensibles.

## Fase 5 — Bilingüismo y estados de proveedor

- Catálogos completos ES/EN, selector y preferencia persistente.
- Traducir controles, estados, errores y etiquetas accesibles, no contenido del usuario.
- Implementar `models_unavailable` conservando la pregunta y ofreciendo reintento.
- Probar indisponibilidad simultánea del modelo principal y fallback.

Criterio: el flujo completo funciona en ES/EN y una caída total no pierde el mensaje
ni genera una respuesta ficticia.

## Iteración futura — Validación

- Definir unidad de “afirmación”.
- Validación manual desde botón.
- Clasificación soportada/parcial/no soportada con citas.
- Persistir método, modelo y resultado sin presentar la validación como verdad externa.
- Añadir pruebas de contradicción y ausencia de evidencia.

Criterio futuro: el usuario puede inspeccionar por qué una afirmación recibió su estado.

## Fase 6 — Calidad y despliegue

- Dataset de evaluación con preguntas directas, combinadas, sin respuesta y
  contradictorias.
- Métricas de recuperación y fidelidad separadas.
- Accesibilidad, responsive y comparación visual.
- Rate limits y cuotas del MVP.
- Observabilidad, alertas y presupuesto.
- Despliegue preview y producción en Vercel.

## Evolución posterior al MVP — Worker asíncrono

No forma parte de la primera implementación. Incorporarlo cuando las métricas reales
muestren timeouts, concurrencia relevante, documentos grandes, OCR o necesidad de
procesar fuera del ciclo de la solicitud. Reutilizará la interfaz de ingesta, estados
e idempotency keys del MVP.

## Estrategia de pruebas

- Unitarias: parsers, normalización, chunking, fusión y formateo de citas.
- Integración: RLS, Storage, jobs, embeddings y fallbacks.
- E2E: login → cuaderno → fuente → procesamiento → pregunta → cita.
- E2E: caída de ambos modelos → error recuperable → reintento sin perder pregunta.
- Seguridad: aislamiento, MIME engañoso, rutas, prompt injection y abuso de cuota.
- Evaluación RAG: recall@k, MRR, fidelidad, relevancia y abstención.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Modelo generativo gratuito desaparece | interfaz de proveedor y cadena configurable |
| Modelo de embeddings desaparece | versión persistida y reindexación controlada |
| PDF difícil de extraer | limitar MVP a capa de texto y mostrar error explícito |
| Costos por contexto | chunking, top-k, límites y telemetría de tokens |
| Citas inventadas | IDs cerrados y validación del servidor |
| Fuga entre usuarios | filtro SQL + RLS + pruebas negativas |
| Mala recuperación | híbrida, dataset de evaluación y reranking posterior |
| Jobs duplicados | idempotency key, hash y estados transaccionales |

## Iteraciones futuras de operación y datos

- Política de retención.
- Backups y pruebas de restauración.
- Eliminación de cuenta y borrado completo de datos y objetos.
- Definición del uso analítico del contenido.
