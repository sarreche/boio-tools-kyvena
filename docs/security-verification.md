# Verificación de seguridad de la fundación

## 3 de agosto de 2026

Proyecto verificado: `boio-tools-kyvena`.

### Esquema

- 10 tablas públicas; las 10 tienen RLS y al menos una política.
- No existen privilegios inesperados para `anon` fuera de la inserción limitada de
  solicitudes de acceso.
- El bucket `sources` es privado, limita archivos a 5 MB y acepta sólo los MIME del MVP.
- pgvector 0.8.2, `halfvec(2048)` e índice HNSW coseno presentes.
- El único `security definer` está en el esquema no expuesto `private`, con permisos
  revocados; crea el perfil al dar de alta un usuario.

### Dos usuarios

- Dos cuentas confirmadas y dos perfiles creados por trigger.
- El usuario A insertó y leyó exactamente su cuaderno temporal.
- Al cambiar la identidad a B, el cuaderno de A devolvió cero filas.
- B insertó y leyó exactamente su propio cuaderno; A continuó sin verlo.
- El intento de B de insertar una fila con el `owner_id` de A fue rechazado con
  `42501: new row violates row-level security policy`.
- Todas las operaciones se revirtieron; quedaron cero filas de prueba.

### Asesores

- Sin hallazgos por políticas, funciones o tablas expuestas.
- Sin claves foráneas carentes de índice después de la migración de hardening.
- Los avisos de índices sin uso son esperables mientras la base esté vacía.
- Advertencia aceptada para el MVP Free: la protección de contraseñas filtradas de
  Supabase requiere plan Pro. Compensar con cuentas manuales y contraseñas fuertes de
  al menos 8 caracteres; revisar nuevamente antes de producción pública.

### Smoke test visible

- El propietario confirmó login con una cuenta real, redirección a Home y logout.
- La Fase 1 cumple su criterio de aceptación.

## Cierre técnico de Fase 2 — 3 de agosto de 2026

- Funciones `security invoker` aplicadas para crear cuadernos, reservar fuentes y
  reencolar ingestas; ejecución revocada a `public` y `anon`.
- Prueba transaccional como `authenticated` validó creación, idempotencia, una sola
  ingesta activa, reintento, reprocesamiento y aislamiento entre dos propietarios.
- Todas las filas de verificación se revirtieron.
- Asesor de seguridad: sin hallazgos nuevos. Continúa únicamente la advertencia
  aceptada de protección de contraseñas filtradas.
- Asesor de rendimiento: sólo índices todavía sin uso, esperables antes de fase 3.
- La aceptación visible se registra por separado en `phase-2-verification.md`.
- El propietario aceptó el cierre de Fase 2 tras pruebas visibles parciales el 3 de
  agosto de 2026; la matriz completa se repetirá como regresión antes de Fase 3.
