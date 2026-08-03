# Límites operativos del MVP

## Estado

Límites iniciales aprobados por delegación del propietario. Deben implementarse como
configuración centralizada y observable, no como números repetidos en componentes.
Se revisarán con métricas reales antes de ampliarlos.

## Fuentes e ingesta

| Límite | Valor MVP | Motivo |
|---|---:|---|
| Tamaño máximo por archivo | 5 MB | Mantener parsing síncrono predecible |
| Archivos seleccionados por vez | 3 | UX simple y errores identificables |
| Procesamiento simultáneo por usuario | 1 | Evitar timeouts y ráfagas al proveedor |
| Fuentes por cuaderno | 20 | Colección suficiente para aprender RAG |
| PDFs por fuente | 75 páginas | Excluir libros/documentos extensos del MVP |
| Texto extraído por archivo | 250.000 caracteres | Limitar memoria, chunks y embeddings |
| Texto pegado por fuente | 100.000 caracteres | Evitar usar el formulario como carga masiva |
| Chunks por fuente | 150 | Acotar tiempo, espacio y llamadas externas |
| Nombre de archivo | 150 caracteres | UI, Storage y logs manejables |

Los tres archivos elegidos pueden aparecer juntos en la cola visual, pero el cliente
los envía y procesa secuencialmente. Un fallo no cancela los demás.

La referencia visual de ingesta muestra “10 MB”; la implementación debe corregir ese
texto a **5 MB** sin alterar el layout aprobado.

## Chunking inicial

| Parámetro | Valor inicial |
|---|---:|
| Objetivo | 400 tokens |
| Solapamiento | 60 tokens |
| Mínimo útil | 80 tokens, salvo unidad estructural indivisible |
| Batch de embeddings | hasta 32 chunks |
| Concurrencia de batches | 1 por fuente |

El chunker respeta primero títulos, párrafos, listas, páginas y secciones. Los valores
son hipótesis de evaluación, no una garantía permanente.

## Cuadernos, almacenamiento y conversaciones

| Límite | Valor MVP |
|---|---:|
| Cuadernos activos por usuario | 10 |
| Fuentes activas totales por usuario | 75 |
| Almacenamiento original por usuario | 50 MB |
| Conversaciones activas por cuaderno | 50 |
| Mensajes considerados como historial del prompt | últimos 12 |

Archivar no debe saltarse cuotas indefinidamente. Para almacenamiento, una fuente
archivada continúa contando hasta su eliminación definitiva.

## Preguntas y recuperación

| Parámetro | Valor MVP |
|---|---:|
| Longitud máxima de pregunta | 4.000 caracteres |
| Resultados vectoriales candidatos | 20 |
| Resultados léxicos candidatos | 20 |
| Fragmentos finales para contexto | máximo 10 |
| Fragmentos por una misma fuente | máximo 4, salvo falta de alternativas |
| Contexto recuperado | máximo estimado de 6.000 tokens |
| Respuesta | máximo configurado de 1.500 tokens |

La recuperación puede devolver menos resultados. No se rellena el contexto con
fragmentos de baja relevancia sólo para alcanzar el máximo.

## Tiempo, reintentos e idempotencia

- Presupuesto objetivo de ingesta: 45 segundos por fuente.
- Timeout individual de proveedor: 15 segundos.
- Reintento automático: uno, sólo para fallo transitorio o `429/503` con espera corta.
- Reintento manual: permitido sobre el mismo trabajo idempotente.
- No duplicar chunks si el cliente repite la solicitud.
- Si el hosting impone un límite menor, reducir estos valores antes de producción.

## Cuotas de modelos gratuitos

Los límites gratuitos de OpenRouter son compartidos por la cuenta y pueden cambiar.
Por eso las cuotas de preguntas e ingestas no se codifican como una promesa comercial.
El servidor debe admitir límites globales y por usuario configurables, devolver un
error accionable cuando el proveedor agote cuota y permitir cambiar a un modelo pago
sin modificar el dominio.

Configuración de prueba sugerida:

- 5 fuentes procesadas por usuario por día.
- 20 preguntas por usuario por día.
- 5 validaciones por usuario por día.

El límite global efectivo puede ser inferior y tiene prioridad.

## Comportamiento al exceder límites

- Rechazar antes de subir cuando tamaño/tipo sean conocidos.
- Detener parsing si se exceden páginas, caracteres o chunks.
- Eliminar derivados parciales y conservar el original sólo si el usuario puede
  corregir/reintentar; de lo contrario eliminarlo.
- Mostrar el límite específico y una acción clara.
- No truncar silenciosamente documentos ni respuestas.

## Señales para ampliar o incorporar worker

- Más del 5 % de ingestas supera el presupuesto de tiempo.
- Necesidad frecuente de más de 5 MB, 75 páginas o 150 chunks.
- Usuarios esperan procesamiento después de cerrar la pantalla.
- OCR, procesamiento por lotes o concurrencia real.
- Reintentos manuales frecuentes por fallos transitorios.

