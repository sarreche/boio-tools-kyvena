# Evaluación reproducible de recuperación — Fase 3

## Estado

Implementada la base reproducible para evaluar recuperación híbrida. Esta evidencia
evalúa recuperación y aislamiento; no implementa ni evalúa generación de respuestas.

## Contratos verificados

- La consulta se envía al modelo de embeddings con prefijo `query: `.
- La función SQL limita cada ranking a 20 candidatos y fusiona por RRF con `k = 60`.
- Coseno y FTS parten del mismo conjunto elegible, filtrado dentro de SQL por usuario,
  cuaderno, fuentes seleccionadas y `sources.status = 'ready'`.
- La selección final admite hasta 10 chunks y 6.000 tokens estimados, con hasta cuatro
  chunks por fuente mientras existan alternativas.
- Un usuario que solicita explícitamente el cuaderno y la fuente de otro recibe cero
  resultados.

## Cómo reproducir

1. Ejecutar `npm.cmd test` para los contratos unitarios de prefijos y presupuesto.
2. Aplicar las migraciones del repositorio al proyecto conectado.
3. Ejecutar `supabase/tests/hybrid_retrieval.sql` con un rol administrativo. El script
   necesita dos usuarios existentes, crea fixtures dentro de una transacción y termina
   con `rollback`.
4. Ejecutar los asesores de seguridad y rendimiento.

## Métricas del conjunto de evaluación

`src/lib/retrieval/evaluation.ts` implementa `recall@k`, reciprocal rank y el resumen
MRR sobre casos versionables con IDs esperados y recuperados. Sus fixtures unitarios
cubren una pregunta directa, una combinada y un fallo de recuperación. El smoke test
SQL es binario y debe pasar antes de medir un corpus conectado más amplio.

Los resultados sobre contenido real deben registrar fecha, modelo efectivo y versión
de pipeline. Todavía no se declara un umbral de calidad aprobado sin un corpus
representativo del producto.
