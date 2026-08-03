# Flujo UX de Kyvena

## Estado visual

- Chat: aprobado (`design/kyvena-chat-approved.png`).
- Login: aprobado (`design/kyvena-login-approved.png`).
- Home: aprobado (`design/kyvena-home-approved.png`).
- Ingesta: aprobada (`design/kyvena-source-ingestion-approved.png`).

## Mapa de navegación

```text
Login
  ├─ Solicitar acceso
  └─ Home
       ├─ Nuevo cuaderno
       ├─ Abrir cuaderno
       │    ├─ Agregar fuentes
       │    └─ Chat + evidencia
       └─ Fuentes
```

## 1. Login

Objetivo: acceder con una cuenta existente y explicar cómo pedir una.

Elementos aprobados:

- Identidad Kyvena y promesa en panel izquierdo.
- Email, contraseña, mostrar/ocultar contraseña e ingresar.
- Selector de idioma ES/EN.
- Enlace “Solicitar acceso”; no hay registro público.
- Nota de privacidad.

Estados necesarios: inicial, campos inválidos, credenciales inválidas, enviando,
bloqueo temporal, error de red y sesión ya iniciada.

## 2. Home

Objetivo: retomar un cuaderno o crear uno sin convertir el inicio en un dashboard.

- Lista de cuadernos recientes con cantidad de fuentes y última actividad.
- Acción principal “Nuevo cuaderno”.
- Atajo “Agregar texto como fuente”.
- Actividad reciente de conversaciones.
- Estados vacío, carga, error, sin actividad y cuaderno sin fuentes.

## 3. Creación de cuaderno

Flujo mínimo:

1. Nombre obligatorio, editable después.
2. Crear cuaderno vacío.
3. Llevar a ingesta con posibilidad de omitirla.

No pedir descripción, categoría ni configuración de modelo en el MVP.

## 4. Ingesta

Dos entradas equivalentes:

- **Subir archivos:** TXT, MD y PDF.
- **Pegar texto:** título opcional y contenido obligatorio.

La UI debe mostrar los límites de `limits.md`: 5 MB por archivo, hasta tres archivos
seleccionados por vez y procesamiento secuencial. El mock aprobado conserva por ahora
un rótulo de 10 MB que debe corregirse a 5 MB durante la implementación.

El texto pegado se guarda como una fuente de tipo `pasted_text` y atraviesa el mismo
pipeline de limpieza, chunking y embeddings.

Estados por fuente:

| Estado | Significado | Acción disponible |
|---|---|---|
| Pendiente | Carga aceptada | Cancelar |
| Procesando | Extracción/chunking/embedding | Esperar |
| Lista | Consultable | Agregar/abrir |
| Error recuperable | Fallo temporal | Reintentar |
| Error definitivo | Tipo, tamaño o contenido inválido | Retirar/reemplazar |

La UI nunca debe decir que una fuente está disponible antes de persistir todos sus
chunks. El chat debe excluir fuentes incompletas.

## 5. Chat y evidencia

Estructura aprobada:

- Sidebar con conversaciones recientes.
- Área central amplia para pregunta y respuesta.
- Panel derecho de evidencia con Fuentes, Citas y Notas.
- Composer anclado con agregar fuente y enviar.
- Citas inline seleccionables que sincronizan el panel de evidencia.

Acciones que deben preservarse:

- Editar la pregunta.
- Copiar respuesta con confirmación temporal.
- Regenerar.
- Detener generación.
- Pulgar arriba/abajo.
- Abrir fuente en página/sección citada.
- Seleccionar fuentes activas.
- Archivar o renombrar conversación.

## Validación de respuesta

Fuera del MVP. El botón no se mostrará hasta disponer de una validación funcional.
La iteración futura propuesta hará una segunda pasada manual que divida la respuesta
en afirmaciones y las clasifique como `soportada`, `parcialmente_soportada` o
`no_soportada`. Debe distinguir respaldo documental de verdad externa y permitir
inspeccionar la evidencia; no se presentará como comprobación absoluta.

## Modelos no disponibles

Si fallan el modelo principal y el único fallback por causas recuperables, conservar
el mensaje del usuario y mostrar un estado de error dentro de la conversación:

- “No hay modelos disponibles en este momento. Tu mensaje no se perdió.”
- Acciones: `Reintentar` y `Copiar pregunta`.
- No crear ni persistir un mensaje de asistente ficticio.
- Conservar el detalle técnico sanitizado sólo para observabilidad.
- Usar el mismo patrón en ES/EN y anunciar el error mediante `aria-live`.

## Idiomas

Toda la interfaz del MVP estará disponible en español e inglés, incluido login,
estados, errores y accesibilidad. La preferencia se conservará por usuario; antes del
login puede conservarse localmente. Fuentes, preguntas y respuestas no se traducen
automáticamente.

## Responsive

- Desktop: chat, sidebar y panel de evidencia simultáneos.
- Tablet: panel de evidencia como drawer.
- Mobile: navegación y evidencia como drawers independientes; composer fijo sin
  cubrir contenido.

## Accesibilidad

- Objetivos táctiles de al menos 44 px.
- Foco visible, navegación completa por teclado y cierre de drawers con Escape.
- Estados no comunicados sólo por color.
- `aria-live` para procesamiento, generación y errores de proveedor.
- Citas con etiqueta accesible que incluya fuente y ubicación.
- Contraste WCAG AA y preferencia de movimiento reducido.
