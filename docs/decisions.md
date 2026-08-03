# Registro de decisiones

## Aprobadas

### Producto

- Nombre: Kyvena.
- Inspiración: NotebookLM, con alcance intencionalmente menor.
- Objetivo adicional: aprender implementando una arquitectura RAG observable.
- Fuentes MVP: TXT, MD, PDF con texto y texto pegado.
- Backend: Supabase.
- LLM: OpenRouter, con modelos sustituibles y posibilidad de variantes gratuitas.
- Modelo generativo principal: `openai/gpt-oss-120b:free`.
- Único fallback generativo: `openai/gpt-oss-20b:free`.
- No agregar una tercera alternativa en el MVP.
- Chat MVP: citas, evidencia, copiar, regenerar, editar, detener y valorar.
- “Validar respuesta” queda fuera del MVP y no se mostrará hasta ser funcional.
- Acceso: email/contraseña, solicitud de cuenta y alta manual; sin signup público.
- Interfaz completa en español e inglés.
- Despliegue aprobado en Vercel; el propietario creará y conectará el proyecto.
- Si principal y fallback no están disponibles, mostrar error recuperable sin inventar
  respuesta, conservar la pregunta y permitir reintentar.
- Recuperación híbrida con rankings semántico y léxico fusionados mediante Reciprocal
  Rank Fusion; filtros de propietario y alcance se aplican dentro de SQL.

### Diseño

- Dirección visual seleccionada: opción 3, “Focus Canvas”.
- Logo: K formada por nodos conectados, azul con pequeño nodo amarillo.
- Chat y login aprobados.
- Home e ingesta aprobados.
- Se conserva el lenguaje visual de Prompt Toolkit sin copiar su identidad.

### Arquitectura

- Supabase concentra Auth, Postgres, pgvector y Storage privado.
- La ingesta no dependerá de Supabase Edge Functions.
- El MVP no tendrá un worker independiente.
- Parsing, chunking y llamadas remotas de embeddings se ejecutarán desde el backend
  de Next.js con límites, timeouts, estados persistidos e idempotencia.
- Un worker asíncrono queda como oportunidad de mejora posterior.
- Límites iniciales definidos en `limits.md`: 5 MB, 75 páginas, 250.000 caracteres,
  150 chunks, 20 fuentes por cuaderno y procesamiento secuencial.

## Propuestas actuales

- Validación manual por afirmaciones reservada para una iteración futura.
- Embeddings `nvidia/nemotron-3-embed-1b:free` mediante OpenRouter.
- `halfvec(2048)` + HNSW coseno si el modelo devuelve 2048 dimensiones sin opción
  de reducción. Confirmado: el endpoint devuelve 2048 normalizado y rechaza 1024.
- El endpoint rechaza `input_type`; Kyvena antepondrá `query: ` a consultas y
  `passage: ` a chunks, según el contrato de recuperación publicado por NVIDIA.
- El procesamiento batch está confirmado y conserva los índices de entrada.

## Pendientes de confirmación

1. Definir estrategia de ambientes y configuración del proyecto Vercel.
2. Definir retención, backups, borrado de cuenta y uso analítico del contenido en una
   iteración futura.

## Hipótesis que deben medirse

- 300–500 tokens y 50–100 de overlap ofrecen recuperación suficiente.
- Top-k inicial de 8–12 fragmentos cabe en presupuesto y conserva cobertura.
- Búsqueda híbrida supera búsqueda vectorial sola en nombres, fechas y términos.
- Una validación futura aporta confianza suficiente para justificar su segunda pasada.
