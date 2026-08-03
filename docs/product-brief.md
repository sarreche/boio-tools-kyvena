# Kyvena: visión y alcance

## Estado del documento

- Nombre **Kyvena**: aprobado.
- Concepto y alcance del MVP: aprobado, sujeto a los pendientes enumerados.
- Implementación: no iniciada.

## Visión

Kyvena es un espacio privado para aprender a partir de fuentes propias. El usuario
crea un cuaderno, agrega documentos o texto y conversa con el conjunto. Las
respuestas deben mostrar evidencia, permitir verificar su respaldo y reconocer
cuando las fuentes no alcanzan.

El producto toma NotebookLM como referencia conceptual, pero reduce deliberadamente
el alcance para servir también como implementación didáctica de RAG.

## Problema

Leer y relacionar varios documentos requiere tiempo. Un chat genérico puede resumir
contenido, pero suele ocultar de dónde proviene una afirmación. Kyvena busca que la
respuesta, la fuente y el fragmento que la respalda permanezcan conectados.

## Promesa de producto

> Preguntá, combiná y validá lo que dicen tus fuentes.

## Usuario inicial

- Persona que estudia RAG y quiere comprender su implementación.
- Profesional o estudiante que consulta una colección pequeña de documentos.
- Usuario no necesariamente técnico que necesita trazabilidad clara.

## Alcance del MVP

### Acceso

- Login por email y contraseña.
- Sin registro público.
- Enlace para solicitar acceso; alta manual de cuentas.

### Cuadernos y fuentes

- Crear, renombrar y archivar cuadernos.
- Agregar TXT, Markdown, PDF con texto seleccionable y texto pegado.
- Estados de fuente: pendiente, procesando, lista, error y eliminada.
- Ver, retirar y reprocesar una fuente.

### Conversación

- Preguntar sobre todas o algunas fuentes del cuaderno.
- Historial persistente y multi-turno.
- Markdown legible.
- Citas inline y panel de evidencia con extracto y ubicación.
- Copiar, regenerar, editar consulta, detener y valorar la respuesta.
- Abstención explícita cuando la evidencia no alcance.
- Interfaz completa en español e inglés; el contenido del usuario no se traduce.

### Generación

- Principal: `openai/gpt-oss-120b:free` mediante OpenRouter.
- Único fallback: `openai/gpt-oss-20b:free`.
- No se incorporan más fallbacks en el MVP.
- Si ambos modelos están indisponibles, mostrar un error recuperable y explícito;
  nunca simular una respuesta ni ocultar la falta de proveedor.

### Recuperación

- Chunking consciente de párrafos, títulos y páginas.
- Embeddings remotos.
- Filtro obligatorio por usuario, cuaderno y fuentes seleccionadas.
- Búsqueda híbrida y fusión de rankings.
- Reranking queda preparado, pero no es requisito inicial.

## Fuera del MVP

- OCR de PDFs escaneados.
- Audio, video, presentaciones e imágenes como fuentes.
- URLs y crawling web.
- Integraciones con Google Drive u otros repositorios.
- Colaboración entre usuarios.
- Podcasts, mapas mentales automáticos y agentes autónomos.
- Fine-tuning o entrenamiento con los documentos.

## Principios

1. **Fuentes antes que fluidez:** una respuesta elegante sin respaldo es un fallo.
2. **Privado por defecto:** cada capa conserva el aislamiento por propietario.
3. **Estados visibles:** la ingesta no aparenta ser instantánea.
4. **Proveedores sustituibles:** el producto no depende de un modelo gratuito.
5. **Simplicidad didáctica:** construir las piezas RAG esenciales antes de abstraer.
6. **No inventar memoria:** las respuestas del asistente no se vuelven fuentes.

## Criterios de éxito del MVP

- Una persona puede pasar de login a primera respuesta citada sin ayuda.
- La fuente correcta aparece entre los resultados para el conjunto de evaluación.
- Cada cita abre un extracto y ubicación verificables.
- El sistema se abstiene ante preguntas fuera de las fuentes.
- Dos usuarios no pueden consultar ni enumerar datos del otro.
- Un fallo de parsing, embedding o LLM queda explicado y permite reintento.

Los límites operativos iniciales están definidos en `limits.md` y forman parte del
alcance del MVP.
