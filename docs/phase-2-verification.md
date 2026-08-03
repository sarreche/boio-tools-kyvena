# Verificación de aceptación — Fase 2

## Estado

Fase **completada y aceptada por el propietario** el 3 de agosto de 2026 después de
pruebas visibles parciales y de la verificación técnica automatizada y transaccional.
La matriz completa queda pendiente como regresión obligatoria antes de comenzar la
implementación de Fase 3; sus casillas no se marcan sin evidencia individual.

## Preparación

- Ejecutar `npm.cmd run dev` y entrar con una cuenta real.
- Usar un cuaderno de prueba con capacidad disponible.
- Confirmar `INGESTION_DAILY_LIMIT` suficientemente alto para la sesión de prueba o
  distribuir la matriz entre días. El valor predeterminado es 5.

## Matriz visible obligatoria

- [ ] TXT UTF-8 válido llega a `Lista` y crea chunks.
- [ ] MD con títulos llega a `Lista` y conserva `location.section`.
- [ ] PDF con texto llega a `Lista`, guarda páginas y conserva `location.page`.
- [ ] PDF escaneado termina en error definitivo explicando que OCR no está soportado.
- [ ] Tres archivos elegidos juntos se procesan en orden y un fallo no cancela los demás.
- [ ] Archivo mayor de 5 MB se rechaza antes de subir.
- [ ] PDF mayor de 75 páginas se rechaza sin truncarlo.
- [ ] Una fuente con más de 250.000 caracteres o 150 chunks se rechaza sin truncarla.
- [ ] Dos solicitudes simultáneas del mismo usuario devuelven `ingestion_busy`.
- [ ] Un fallo recuperable permite `Reintentar` y no duplica chunks.
- [ ] Una fuente lista permite `Reprocesar` y reemplaza sus chunks transaccionalmente.
- [ ] `Cancelar` elimina una fuente pendiente.
- [ ] `Retirar` borra el original de Storage y la fila con sus trabajos/chunks.
- [ ] Un segundo usuario no puede leer, descargar, reintentar ni retirar la fuente.
- [ ] Estados, errores, foco y anuncios `aria-live` son comprensibles en ES y EN.

## Evidencia en Supabase

Para una fuente lista comprobar:

- `sources.status = ready`, texto extraído, hash, tamaño y página cuando corresponda.
- `ingestion_jobs.stage = completed` y número de intento esperado.
- `chunks` contiene modelo, proveedor, versión de pipeline, embedding y ubicación.
- El original existe sólo para TXT/MD/PDF y su ruta comienza con el propietario.

Para una retirada comprobar que no quedan objeto, fuente, trabajo ni chunks.

## Cierre

Registrar fecha, navegador, formatos probados y cualquier incidencia al ejecutar la
regresión completa. Una incidencia reabre Fase 2 antes de continuar con Fase 3.
