# Verificación de embeddings OpenRouter/NVIDIA

## Ejecución del 2 de agosto de 2026

Modelo solicitado: `nvidia/nemotron-3-embed-1b:free`.

Resultados confirmados mediante la API real:

- La clave con límite de gasto USD 0 permite ejecutar el modelo gratuito.
- OpenRouter reporta `is_free_tier: true`, `limit: 0` y `limit_remaining: 0`.
- Modelo efectivo: `private/openrouter/nvidia/nemotron-3-embed-1b`.
- Dimensión predeterminada: 2048.
- Norma L2: 1; el vector llega normalizado.
- Latencia observada para una entrada breve: aproximadamente 500 ms.
- `dimensions: 1024` devuelve HTTP 400; no hay reducción gestionada por este endpoint.

Evidencia: `evidence/openrouter-nemotron-embedding-verification-2026-08-02.png`.

## Decisión resultante

Usar `halfvec(2048)` e índice HNSW con `halfvec_cosine_ops`. No truncar manualmente
en el MVP. Consultas y documentos deben usar exactamente el mismo endpoint/modelo.

## Segunda ejecución del 2 de agosto de 2026

- `input_type: search_query/search_document` devuelve HTTP 400 incluso sin enviar
  `dimensions`; este parámetro no forma parte del contrato utilizable.
- El batch sin `input_type` funciona: devolvió tres vectores de 2048 dimensiones,
  conservando los índices `0, 1, 2`, en aproximadamente 483 ms.
- Evidencia: `evidence/openrouter-nemotron-input-type-batch-verification-2026-08-02.png`.

La tarjeta oficial de NVIDIA indica que las consultas deben llevar el prefijo
`query: ` y los documentos `passage: `. Kyvena debe agregarlos al texto enviado,
sin depender de `input_type`.

## Tercera ejecución del 2 de agosto de 2026

El ranking semántico con los prefijos oficiales quedó validado:

- Documento 1, relevante para la consulta RAG: `0.598479`.
- Documento 2, relacionado sólo por búsqueda vectorial: `0.089797`.
- Documento 3, no relacionado: `0.026164`.
- Consulta: aproximadamente 397 ms.
- Batch de tres documentos: aproximadamente 787 ms.

El documento relevante obtuvo claramente la mayor similitud. La salida visual lo
mostró al final y calculó `actual_top_document: 3` por un defecto del ordenamiento de
diccionarios del script, no del modelo. El script fue corregido para ordenar por el
valor numérico de la clave `score`.

Evidencia: `evidence/openrouter-nemotron-prefixed-semantic-ranking-2026-08-02.png`.

## Contrato validado para el MVP

- Modelo solicitado: `nvidia/nemotron-3-embed-1b:free`.
- Dimensión: 2048, normalización L2.
- Sin `dimensions` ni `input_type`.
- Consulta: prefijo `query: `.
- Chunks: prefijo `passage: `, enviados en batch.
- Persistencia: `halfvec(2048)` y similitud coseno.

Script reproducible: `../scripts/verify-openrouter-embeddings.ps1`.
