# AGENTS.md

## Propósito

Este repositorio contiene **Kyvena**, una aplicación web educativa inspirada en
NotebookLM. Su objetivo es enseñar y demostrar una arquitectura RAG real mediante
un producto sencillo: el usuario crea cuadernos, incorpora fuentes y conversa con
ellas recibiendo respuestas trazables y validables.

El proyecto se encuentra en **fase de planificación y diseño**. No hay todavía una
implementación de producto. La documentación debe distinguir siempre entre:

- **Aprobado:** decisión confirmada por el propietario del producto.
- **Propuesto:** dirección recomendada aún no confirmada.
- **Implementado:** comportamiento verificado en código ejecutable.
- **PENDIENTE DE CONFIRMACIÓN:** decisión que no debe asumirse.

Nunca describir algo propuesto como implementado.

## Fuentes de verdad

Leer antes de diseñar o implementar:

- `docs/product-brief.md`: alcance y objetivos.
- `docs/ux-flow.md`: navegación, pantallas, acciones y estados.
- `docs/architecture.md`: arquitectura RAG y límites de confianza.
- `docs/implementation-plan.md`: fases y criterios de aceptación.
- `docs/limits.md`: límites operativos aprobados del MVP.
- `docs/embedding-verification.md`: evidencia del contrato real de embeddings.
- `docs/decisions.md`: decisiones y asuntos abiertos.
- `docs/design/`: referencias visuales aprobadas o propuestas.

Si documentación, diseño y código difieren, informar la discrepancia antes de
elegir silenciosamente una fuente.

## Alcance aprobado del MVP

- Login por email y contraseña, sin registro público.
- Solicitud de acceso separada; las cuentas se crean manualmente.
- Cuadernos privados por usuario.
- Fuentes TXT, MD, PDF con capa de texto y texto pegado.
- Ingesta asíncrona con estados visibles.
- Chat persistente y multi-turno fundamentado en fuentes seleccionadas.
- Citas navegables a fragmentos, páginas o secciones.
- Acciones MVP de copiar, regenerar, editar, detener y valorar respuestas.
- Interfaz completa en español e inglés.
- Búsqueda híbrida: semántica y palabras clave.
- Supabase para Auth, Postgres, pgvector y Storage.
- OpenRouter como pasarela de modelos. Cadena generativa aprobada:
  `openai/gpt-oss-120b:free` y fallback `openai/gpt-oss-20b:free`.

Fuera del MVP: OCR, audio, video, crawling web, Google Drive, colaboración,
podcasts, knowledge graphs, fine-tuning y agentes autónomos.

## Dirección visual aprobada

La referencia principal es `docs/design/kyvena-chat-approved.png` y el login
aprobado está en `docs/design/kyvena-login-approved.png`.

- Fondo blanco cálido, superficies blancas y divisores gris frío.
- Azul primario `#1261ff`, texto azul marino oscuro y acento amarillo mínimo.
- Logo Kyvena con una K formada por nodos conectados.
- Tipografía directa, jerarquía amplia, controles accesibles y sombras mínimas.
- La evidencia es parte central del chat, no un detalle oculto.
- Preservar del proyecto Prompt Toolkit: copiar, regenerar, valoración útil/no útil,
  edición de consulta, detener generación, historial, archivo y feedback claro.

Un cambio técnico no autoriza rediseñar la experiencia. Consultar antes de retirar,
ocultar, renombrar o reordenar acciones aprobadas.

## Reglas de arquitectura y seguridad

1. Nunca incorporar secretos ni valores reales de `.env`.
2. Mantener claves privilegiadas y claves de proveedores sólo en servidor.
3. Habilitar RLS en toda tabla expuesta y comprobar propiedad por usuario.
4. `TO authenticated` no es autorización suficiente: incluir predicado de dueño.
5. No usar `user_metadata` editable para roles o autorización.
6. Mantener buckets privados y rutas de objetos bajo prefijo del propietario.
7. Filtrar por usuario y cuaderno dentro de la consulta de recuperación, nunca
   después de recuperar resultados globales.
8. Tratar documentos como datos no confiables, nunca como instrucciones del sistema.
9. Validar tipo real, tamaño y nombre de archivo; no confiar sólo en la extensión.
10. Decisión aprobada para el MVP: no usar Edge Functions ni un worker independiente
   para la ingesta. Ejecutar parsing, chunking y llamadas remotas de embeddings desde
   el backend de Next.js, con límites estrictos, estados e idempotencia.
11. Mantener la ingesta detrás de una interfaz de servicio para poder migrarla a un
   worker asíncrono sin cambiar el dominio ni la UI.
12. Guardar modelo, versión, dimensión, normalización y estrategia de chunking.
13. Cambiar de embedding implica reindexar todas las fuentes afectadas.
14. No convertir respuestas del asistente automáticamente en fuentes.
15. Borrar una fuente debe borrar archivo, texto extraído, chunks, embeddings y
    derivados asociados.
16. No añadir modelos generativos a la cadena de fallback sin aprobación explícita.
17. El fallback sólo aplica a fallos técnicos recuperables; no debe ocultar errores
    de credenciales, configuración, entrada inválida, autorización o políticas.
18. Si principal y fallback están indisponibles, devolver `models_unavailable`,
    conservar la pregunta y no generar una respuesta ficticia ni activar modelos pagos.
19. “Validar respuesta” queda fuera del MVP y no debe mostrarse como acción incompleta.

## Preservación de producto

Antes de modificar una pantalla existente, inventariar:

- navegación y acciones;
- estados vacío, carga, éxito, error, reintento y deshabilitado;
- responsive, teclado, foco y etiquetas accesibles;
- textos en español e inglés cuando el bilingüismo esté implementado;
- renderizado Markdown, citas y panel de evidencia;
- edición, copia, regeneración, valoración y cancelación; validación sólo cuando una
  iteración futura la implemente de extremo a extremo.

Detenerse y consultar antes de eliminar una capacidad, cambiar el modelo mental del
flujo, alterar de forma apreciable la densidad o introducir un cambio visible que no
sea necesario para el pedido.

## Implementación y verificación

- Trabajar incrementalmente: esquema/seguridad, servicios, APIs, UI y pulido.
- Mantener migraciones reproducibles y revisar asesores de seguridad/rendimiento.
- Fijar versiones de dependencias y conservar el lockfile.
- Añadir pruebas para parsing, chunking, aislamiento, recuperación, citas y fallback.
- Para UI, comparar contra las referencias aprobadas en los mismos estados y tamaños.
- Un build exitoso no sustituye una verificación funcional y visual.
- Actualizar documentación cuando cambien alcance, modelos, proveedores, variables,
  esquema, seguridad o despliegue.

## Git y GitHub

- No trabajar directamente sobre `master`.
- Usar ramas `feature/`, `change/`, `docs/` o `fix/` con nombres descriptivos.
- Usar commits `feat:`, `change:`, `docs:` o `fix:` y mantenerlos enfocados.
- Antes de publicar, confirmar la identidad Git y la cuenta GitHub esperadas con el
  propietario; no copiar automáticamente identidad del repositorio de referencia.
- No hacer push ni crear pull requests salvo solicitud explícita.

## PENDIENTES DE CONFIRMACIÓN

- Estrategia de ambientes y configuración del proyecto Vercel.
- Retención, backups, eliminación de cuentas y uso analítico para una iteración futura.
- Planes y monetización.
