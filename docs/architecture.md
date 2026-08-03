# Arquitectura propuesta

## Estado

Arquitectura de referencia para el MVP, **implementada parcialmente**.

Implementado y verificado: autenticación y aislamiento RLS, cuadernos, esquema y
Storage privado, el pipeline completo de texto pegado y TXT/MD/PDF desde `pending`
hasta `ready`, extracción de páginas, chunking, embeddings OpenRouter, persistencia
transaccional en `halfvec(2048)` y gestión completa de la fuente. La aceptación de
fase 2 requiere todavía completar su matriz visible. Pendientes de producto:
recuperación híbrida, chat RAG y capacidades posteriores de `implementation-plan.md`.

## Componentes

```text
Navegador
  ├─ Next.js UI
  ├─ Supabase Auth (sesión)
  └─ API de aplicación
       ├─ Supabase Postgres + pgvector
       ├─ Supabase Storage privado
       ├─ Servicio de ingesta en backend Next.js
       │    ├─ extracción TXT/MD/PDF
       │    ├─ limpieza y chunking
       │    └─ OpenRouter Embeddings
       └─ Orquestador RAG
            ├─ embedding de consulta
            ├─ búsqueda híbrida filtrada
            ├─ construcción de contexto
            ├─ OpenRouter LLM + fallback
            └─ persistencia de respuesta/citas
```

## Responsabilidades de Supabase

- Auth: email/contraseña y sesiones.
- Postgres: cuadernos, fuentes, chunks, conversaciones, mensajes, ejecuciones,
  citas, valoraciones, validaciones y auditoría.
- pgvector: similitud semántica.
- Full Text Search: coincidencia léxica.
- Storage: documentos originales en bucket privado.

Decisión aprobada para el MVP: las Edge Functions y los workers independientes no
forman parte del pipeline de ingesta. Una ruta autenticada del backend de Next.js
ejecutará parsing, chunking y llamadas remotas de embeddings dentro de la solicitud.

Esta simplificación exige límites conservadores y timeouts explícitos. La ingesta se
encapsula detrás de una interfaz de servicio y conserva trabajos, etapas e idempotencia
en la base para poder trasladarla posteriormente a un worker sin cambiar la UI ni el
modelo de dominio.

Los valores concretos y el comportamiento al excederlos están en `limits.md`.

## Pipeline de ingesta

1. Validar sesión, tamaño, tipo MIME, extensión y pertenencia del cuaderno.
2. Calcular hash y crear `source` en estado `pending`.
3. Subir desde el navegador al bucket privado bajo
   `{user_id}/{notebook_id}/{source_id}/original`; el binario no atraviesa la Function
   porque Vercel limita su request a 4,5 MB y el producto admite archivos de 5 MB.
4. Crear o reclamar un trabajo idempotente y marcar la fuente `processing`.
5. Extraer texto y ubicación estructural dentro de la solicitud del backend.
6. Normalizar sin destruir títulos, listas, páginas o secciones.
7. Crear chunks de 300–500 tokens con 50–100 de solapamiento como punto inicial.
8. Generar embeddings remotos en lotes con timeout y límite de concurrencia.
9. Insertar chunks y embeddings transaccionalmente.
10. Marcar la fuente `ready`; ante fallo registrar etapa, código y permitir reintento.

La reserva se serializa mediante un bloqueo transaccional por usuario. En esa misma
operación se aplican idempotencia, concurrencia, cuota diaria, cantidad de fuentes y
almacenamiento. Un trabajo sin actividad durante diez minutos pasa a error
recuperable. Retirar una fuente elimina primero el objeto mediante Storage API y sólo
después borra la fila; las claves foráneas eliminan texto, trabajos, chunks y vectores.

PDF del MVP significa PDF con capa de texto. Si la extracción no produce contenido
útil, devolver un error que explique que OCR todavía no está soportado.

### Evolución a worker asíncrono

Queda registrada como mejora posterior cuando existan PDFs grandes, procesamiento
por lotes, múltiples cargas simultáneas, reintentos automáticos, OCR o necesidad de
continuar tras cerrar la página. La transición reemplaza el ejecutor, no el contrato:
la API crea el trabajo y el worker reclama las mismas etapas persistidas.

## Embeddings

Proveedor implementado actualmente para embeddings: OpenRouter. La posibilidad de
sustituirlo y su permanencia como proveedor del MVP se mantienen como decisión de
producto revisable.

- Modelo preferido actual: `nvidia/nemotron-3-embed-1b:free`.
- Salida nativa: 2048 dimensiones.
- Español incluido entre los idiomas evaluados por NVIDIA.
- Modelo gratuito sujeto a disponibilidad, límites y cambios de precio.

Decisión confirmada mediante la API real: el endpoint devuelve vectores normalizados
de 2048 dimensiones y rechaza `dimensions: 1024` con HTTP 400. El MVP usará
`halfvec(2048)` con HNSW y `halfvec_cosine_ops`, sin truncado manual. pgvector admite
HNSW sobre `halfvec` hasta 4.000 dimensiones. Ver `embedding-verification.md`.

El endpoint probado también rechaza `input_type`. Para recuperación, aplicar en la
aplicación los prefijos definidos por NVIDIA: `query: ` para la consulta y `passage: `
para cada chunk. Enviar los chunks por lotes como un arreglo y conservar el mapeo por
el campo `index` de la respuesta.

Guardar por fuente y chunk: proveedor, modelo exacto, dimensión, normalización,
fecha, versión lógica del pipeline y estrategia de chunking.

## Recuperación

1. Embedding de consulta con el mismo modelo/espacio vectorial.
2. Búsqueda semántica por coseno.
3. Full Text Search en español o configuración acordada.
4. Restricción SQL por `owner_id`, `notebook_id`, fuente lista y selección activa.
5. Fusionar rankings mediante Reciprocal Rank Fusion.
6. Aplicar diversidad por fuente y presupuesto de contexto.
7. Opcional posterior: reranker.
8. Enviar al LLM fragmentos numerados con metadatos de cita.

## Generación y citas

Cadena aprobada:

1. `openai/gpt-oss-120b:free` como modelo principal.
2. `openai/gpt-oss-20b:free` como único fallback.

Ambos modelos son de texto, admiten razonamiento y contexto amplio. Que el endpoint
sea gratuito hoy no constituye una garantía futura; la cadena se guarda en
configuración y cada ejecución persiste el modelo solicitado y el efectivo.

Activar fallback ante timeout, fallo de red, `408`, `429`, `5xx`, respuesta vacía o
respuesta estructuralmente inválida. No activarlo ante `400`, `401`, `403`, entrada
demasiado grande, falta de autorización o rechazo de política: esos errores deben
corregirse o comunicarse. Como máximo se hace un intento por modelo, salvo una espera
breve indicada explícitamente por `Retry-After`.

Si también falla el fallback, devolver un error de dominio `models_unavailable` con
identificador de correlación y detalle interno sanitizado. La UI conserva la pregunta
y ofrece reintento; el backend no persiste una respuesta del asistente. No se añadirá
un tercer modelo ni una ruta de pago de forma automática.

La interfaz se internacionaliza con catálogos ES/EN y claves estables. Persistir la
preferencia de idioma separada del contenido; no traducir documentos ni preguntas
del usuario automáticamente.

El prompt exige:

- responder sólo con contexto recuperado;
- distinguir evidencia de instrucciones contenidas en documentos;
- citar cada afirmación material;
- expresar insuficiencia o contradicción;
- devolver estructura validable, no IDs inventados.

El servidor verifica que cada cita devuelta corresponda a un chunk recuperado antes
de persistirla. El LLM no recibe rutas privadas ni secretos.

## Modelo de datos conceptual

- `profiles`
- `notebooks`
- `sources`
- `source_processing_jobs`
- `source_chunks`
- `conversations`
- `messages`
- `generation_runs`
- `message_citations`
- `message_ratings`
- `answer_validations`
- `answer_validation_claims`

Las tablas expuestas tienen RLS. Datos operativos sensibles pueden residir en un
schema privado y consumirse sólo desde servidor.

## Límites de confianza

- Navegador, nombres, archivos y texto son no confiables.
- La publishable key es pública por diseño; `service_role` nunca llega al cliente.
- Un documento puede contener prompt injection y no modifica instrucciones.
- La recuperación nunca consulta corpus global y filtra después.
- URLs firmadas son cortas; borrar una fuente revoca acceso futuro y elimina datos.
- Cuotas, idempotencia y rate limits se verifican en servidor.

## Observabilidad mínima

- Duración y resultado por etapa de ingesta.
- Modelo efectivo y fallback.
- Tokens, latencia y errores por proveedor.
- Chunks recuperados, rankings y citas utilizadas.
- Feedback del usuario sin guardar contenido adicional innecesario.
- IDs correlacionables sin exponer secretos ni texto sensible en logs.
