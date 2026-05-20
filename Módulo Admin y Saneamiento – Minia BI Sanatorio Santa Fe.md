\# MÓDULO DE ADMINISTRACIÓN Y SANEAMIENTO — Minia BI Sanatorio Santa Fe  
\#\# Para Antigravity: especificación completa del módulo Admin

\---

\#\# 1\. VISIÓN GENERAL

El módulo de Administración es una sección dentro del dashboard Minia que permite gestionar el saneamiento de datos directamente desde la interfaz, sin necesidad de editar Excels, Google Sheets ni tocar SQL.

\#\#\# Quién accede  
\- \*\*Admin\*\* (Imalá): acceso total — puede ver, editar y configurar todo  
\- \*\*Coordinador de datos\*\* (Macarena): acceso al saneamiento de datos — puede clasificar códigos, unificar nombres, gestionar obras sociales, sin acceso a configuración técnica

\#\#\# Qué hace este módulo  
Permite que Macarena y el equipo del sanatorio vean exactamente qué datos llegaron crudos de la API de GECLISA y decidan cómo tratarlos: si un código es un estudio válido, si hay que excluirlo, cómo se llama correctamente, a qué obra social pertenece, etc.

Cuando guardan un cambio en este módulo, las vistas Gold lo reflejan automáticamente en los gráficos — sin intervención de Imalá.

\---

\#\# 2\. ACCESO Y ROLES

\#\#\# Configuración en Supabase Auth  
Dos roles con custom claims:

\`\`\`javascript  
// Rol Admin (Imalá)  
{ "role": "admin" }  
// Acceso: todo el módulo Admin \+ todos los departamentos

// Rol Coordinador de datos (Macarena)  
{ "role": "coordinador\_datos" }  
// Acceso: saneamiento de datos \+ vista de todos los departamentos habilitados  
// NO accede a: configuración técnica, gestión de usuarios  
\`\`\`

\#\#\# Visibilidad en el sidebar  
\`\`\`  
ADMINISTRACIÓN  
├── 🗂️  Saneamiento de datos     ← Admin \+ Coordinador de datos  
└── ⚙️  Configuración técnica    ← Solo Admin  
\`\`\`

\---

\#\# 3\. PANTALLA PRINCIPAL DEL MÓDULO — SANEAMIENTO DE DATOS

\#\#\# 3.1 Header de la pantalla  
\`\`\`  
┌─────────────────────────────────────────────────────────────┐  
│  🗂️  Saneamiento de datos                                    │  
│  Gestioná cómo se clasifican y nombran los datos que        │  
│  llegan del sistema GECLISA antes de aparecer en los        │  
│  gráficos.                                \[?\] Ayuda general │  
├─────────────────────────────────────────────────────────────┤  
│  ⚠️  5 códigos nuevos sin clasificar requieren tu atención  │  
│      \[ Ver códigos pendientes \]                             │  
└─────────────────────────────────────────────────────────────┘  
\`\`\`

La alerta de "códigos sin clasificar" aparece automáticamente cuando la sincronización trae códigos nuevos de GECLISA que todavía no tienen regla en Silver.

\#\#\# 3.2 Filtros globales (aplican a todas las pestañas)  
\`\`\`  
\[ Departamento ▼ \]  \[ Servicio ▼ \]  \[ Estado ▼ \]  \[ 🔍 Buscar... \]

Departamento: Todos / Diagnóstico por Imágenes / Laboratorio / ...  
Servicio:     Todos / Videoendoscopía / Tomografía / Resonancia / Ecografía / ...  
Estado:       Todos / ✅ Clasificado / ⚠️ Pendiente / ❌ Excluido  
Buscar:       búsqueda libre por código, nombre crudo o nombre unificado  
\`\`\`

\#\#\# 3.3 Pestañas del módulo  
\`\`\`  
\[ Códigos de estudio \]  \[ Obras sociales \]  \[ Intermediarias \]  \[ Sedes \]  
\`\`\`

\---

\#\# 4\. PESTAÑA — CÓDIGOS DE ESTUDIO

\#\#\# Qué es  
Tabla con todos los códigos de nomenclador que llegaron de GECLISA. Para cada código, Macarena decide si es un estudio válido, si hay que excluirlo y cómo se llama.

Lee de: \`silver\_shared.silver\_codigos\_nomenclador\`  
Escribe en: \`silver\_shared.silver\_codigos\_nomenclador\`

\#\#\# Botón de ayuda \[?\] — texto que aparece al hacer click  
\`\`\`  
💡 ¿Qué es un código de estudio?  
Cada vez que se realiza un estudio médico en el sanatorio, GECLISA  
lo registra con un código numérico. Por ejemplo, el código 200137  
corresponde a una "Videoendoscopía digestiva diagnóstica alta".

Tu tarea es decirle al sistema:  
✅ ES ESTUDIO: este código debe contarse en los reportes  
❌ NO ES ESTUDIO: este código existe en GECLISA pero no es un  
   estudio (puede ser anestesia, materiales, sala de recuperación, etc.)  
⚠️ MAL CARGADO: este código está registrado en el servicio equivocado  
   (por ejemplo, un código de Resonancia aparece en Videoendoscopía)

También podés darle un NOMBRE UNIFICADO: si el mismo estudio tiene  
varios códigos con nombres distintos, podés hacer que todos aparezcan  
con el mismo nombre en los gráficos.

Si tenés dudas sobre algún código, consultá con Daniel de Informática.  
\`\`\`

\#\#\# Estructura de la tabla  
| Col | Campo | Editable | Descripción |  
|-----|-------|----------|-------------|  
| \- | ⚠️/✅/❌ | No | Indicador visual de estado |  
| \- | Departamento | No | DI, Lab, etc. |  
| \- | Servicio | No | Video, Tomo, Reso, etc. |  
| \- | Código | No | Código numérico de GECLISA |  
| \- | Nombre original (GECLISA) | No | Tal como viene del sistema |  
| \- | Clasificación | Sí | Toggle: ✅ Es estudio / ❌ No es estudio / ⚠️ Mal cargado |  
| \- | Nombre unificado | Sí | Campo de texto — nombre limpio para los gráficos |  
| \- | Acciones | \- | \[ Guardar \] \[ Ver en gráficos \] |

\#\#\# Comportamiento visual  
\- Filas sin clasificar: fondo naranja suave \+ ícono ⚠️  
\- Filas clasificadas como "Es estudio": fondo verde muy suave  
\- Filas excluidas: fondo rojo muy suave \+ texto tachado en nombre original  
\- Filas "Mal cargado": fondo amarillo \+ tooltip explicando el problema

\#\#\# Edición inline  
\- Al hacer click en "Clasificación" abre un dropdown: ✅ Es estudio / ❌ No es estudio / ⚠️ Mal cargado  
\- Al hacer click en "Nombre unificado" se convierte en campo de texto editable  
\- Al guardar, muestra confirmación: "✅ Guardado. Los gráficos se actualizarán en la próxima sincronización."

\#\#\# Acciones masivas  
Checkbox en cada fila \+ barra de acciones masivas:  
\`\`\`  
☑️ 12 seleccionados  \[ Marcar como: Es estudio ▼ \]  \[ Asignar nombre: \_\_\_ \]  \[ Aplicar \]  
\`\`\`

\#\#\# Buscador  
\- Busca en tiempo real por código, nombre original o nombre unificado  
\- Resalta el término buscado en los resultados

\---

\#\# 5\. PESTAÑA — OBRAS SOCIALES

\#\#\# Qué es  
Lista de todas las obras sociales que llegaron de GECLISA con sus nombres truncados (máximo 15 caracteres por limitación del sistema). Macarena y Daniel completan el nombre completo correcto.

Lee de: \`silver\_shared.silver\_os\_equivalencias\` \+ valores únicos de Bronze  
Escribe en: \`silver\_shared.silver\_os\_equivalencias\`

\#\#\# Botón de ayuda \[?\] — texto  
\`\`\`  
💡 ¿Por qué los nombres están cortados?  
El sistema GECLISA tiene una limitación técnica: los nombres de obras  
sociales solo pueden tener hasta 15 caracteres. Por eso "HOSPITAL DE  
NIÑOS" llega como "HOSPITAL DE NI".

Tu tarea es completar el nombre completo correcto para que los gráficos  
muestren los nombres completos y legibles.

También podés agrupar obras sociales: si "OSDE 210" y "OSDE 410" deben  
aparecer juntas como "OSDE" en los gráficos, escribí "OSDE" como nombre  
unificado para ambas.

Si no estás segura de algún nombre, consultá con Daniel de Informática.  
\`\`\`

\#\#\# Estructura de la tabla  
| Estado | Nombre crudo (GECLISA) | Nombre completo correcto | Cantidad de estudios | Acciones |  
|--------|----------------------|-------------------------|---------------------|----------|  
| ⚠️ Pendiente | HOSPITAL DE NI | \[ escribir acá \] | 234 | \[ Guardar \] |  
| ✅ Completo | IAPOS | IAPOS | 1.820 | \[ Editar \] |  
| ✅ Completo | OSDE | OSDE | 2.140 | \[ Editar \] |

\#\#\# Comportamiento especial  
\- Mostrar "Cantidad de estudios" ayuda a Macarena a priorizar — las obras sociales con más estudios son más urgentes de completar  
\- Si el nombre crudo ya es claro (IAPOS, PAMI), pre-completar automáticamente con el mismo valor y marcar como "sugerido" para que Macarena confirme  
\- Opción de "agrupar": si dos nombres crudos distintos deben unificarse, seleccionarlos y asignar el mismo nombre completo

\#\#\# Indicador de progreso  
\`\`\`  
Obras sociales completadas: 68 de 76  ████████░░  89%  
\[ Ver las 8 pendientes \]  
\`\`\`

\---

\#\# 6\. PESTAÑA — INTERMEDIARIAS

\#\#\# Qué es  
Las intermediarias son las entidades que gestionan la cobertura médica (IAPOS, IMSA, Cajas, etc.). Son pocos valores (6 actualmente) pero pueden crecer.

Lee/escribe: \`silver\_shared.silver\_intermediaria\_equivalencias\`

\#\#\# Botón de ayuda \[?\] — texto  
\`\`\`  
💡 ¿Qué es una intermediaria?  
Es la entidad que gestiona o intermedia la cobertura del estudio.  
Por ejemplo: IAPOS es el seguro social provincial, IMSA es una  
empresa de medicina prepaga, Directas son pacientes que pagan  
directamente sin cobertura, etc.

El sistema GECLISA guarda estos nombres con espacios al final  
(limitación técnica). Acá podés ver cómo aparecen en el sistema  
y el nombre limpio que se muestra en los gráficos.  
\`\`\`

\#\#\# Estructura (tabla simple)  
| Valor en GECLISA | Nombre limpio en gráficos | Estudios | Estado |  
|------------------|--------------------------|----------|--------|  
| Iapos \+ espacios | IAPOS | 1.820 | ✅ |  
| Imsa \+ espacios | IMSA | 864 | ✅ |  
| CAJAS \+ espacios | Cajas | 412 | ✅ |

\---

\#\# 7\. PESTAÑA — SEDES

\#\#\# Qué es  
Mapeo de los nombres de servicio que vienen de GECLISA a una sede física del sanatorio.

Lee/escribe: \`silver\_shared.silver\_sedes\_equivalencias\`

\#\#\# Botón de ayuda \[?\] — texto  
\`\`\`  
💡 ¿Qué es una sede?  
El Grupo Santa Fe tiene múltiples sedes: Sanatorio Santa Fe central,  
Santo Tomé, Esperanza, San Luis, General Paz, CEMI, entre otras.

GECLISA registra los servicios con nombres que a veces incluyen la  
sede (ej: "ECOGRAFÍAS CLINICA ESPERANZA") y otras veces no.

Acá podés asegurarte de que cada servicio esté correctamente  
asociado a su sede para que los filtros del dashboard funcionen bien.  
\`\`\`

\#\#\# Estructura  
| Nombre en GECLISA | Nombre limpio | Sede asignada | Estado |  
|-------------------|--------------|---------------|--------|  
| ECOGRAFÍAS CLINICA ESPERANZA | Ecografías | Esperanza | ✅ |  
| ECOGRAFÍAS CLINICA STO TOME | Ecografías | Santo Tomé | ✅ |  
| ECOGRAFÍAS | Ecografías | Santa Fe | ✅ |

\---

\#\# 8\. ALERTAS Y NOTIFICACIONES AUTOMÁTICAS

\#\#\# Alerta de códigos nuevos  
Cada vez que el script Python sincroniza datos y aparece un código que no está en \`silver\_codigos\_nomenclador\`, el sistema:  
1\. Registra el código nuevo como "Pendiente" en Silver  
2\. Muestra un banner en el módulo Admin: "⚠️ X códigos nuevos requieren clasificación"  
3\. Envía un email automático a los usuarios con rol Coordinador de datos

\#\#\# Alerta de obra social nueva  
Igual que códigos — si aparece un valor de \`obraSocial\` que no está en \`silver\_os\_equivalencias\`, se marca como pendiente y se notifica.

\#\#\# Email de notificación (template)  
\`\`\`  
Asunto: \[BI Sanatorio Santa Fe\] Hay datos nuevos para clasificar

Hola Macarena,

La sincronización de datos de hoy encontró elementos nuevos que  
necesitan tu atención:

\- 3 códigos de estudio nuevos sin clasificar  
\- 1 obra social nueva sin nombre completo

Ingresá al sistema para revisarlos:  
\[Ir al módulo de saneamiento\]

Equipo Imalá  
\`\`\`

\---

\#\# 9\. HISTORIAL DE CAMBIOS

Dentro del módulo Admin, una sección "Historial" muestra los últimos cambios realizados:

\`\`\`  
📋 Últimos cambios en el saneamiento

Hoy 14:32 — Macarena clasificó "532007 VIDEOESOFAGO" como ✅ Es estudio  
             Nombre unificado: "Videoesofagogastro"

Hoy 14:28 — Macarena completó obra social "HOSPITAL DE NI"  
             Nombre completo: "Hospital de Niños"

Ayer 10:15 — Admin actualizó intermediaria "Particular"  
\`\`\`

Esto permite auditar quién hizo cada cambio y revertir si algo se guardó mal.

\---

\#\# 10\. CONSIDERACIONES TÉCNICAS

\#\#\# Permisos en Supabase (Row Level Security)  
\`\`\`sql  
\-- Admin: puede hacer todo  
\-- Coordinador de datos: puede SELECT e UPDATE en tablas silver\_shared  
\-- No puede INSERT ni DELETE (para evitar borrar datos por error)  
\-- Director: solo SELECT  
\`\`\`

\#\#\# Cuándo se reflejan los cambios en los gráficos  
\- Los cambios en Silver se reflejan inmediatamente en las vistas Gold  
\- No hace falta esperar la próxima sincronización  
\- Mostrar un mensaje: "✅ Cambio guardado. Los gráficos ya reflejan esta actualización."

\#\#\# Detección automática de códigos nuevos  
El script Python de sincronización, después de insertar en Bronze, ejecuta:  
\`\`\`sql  
\-- Detectar códigos en Bronze que no están en Silver  
INSERT INTO silver\_shared.silver\_codigos\_nomenclador (codigo, nombre\_original, servicio, es\_estudio, excluir)  
SELECT DISTINCT codigo, nombre, servicio, NULL, NULL  
FROM diagnostico\_imagenes.bronze\_videoendoscopia  
WHERE codigo NOT IN (SELECT codigo FROM silver\_shared.silver\_codigos\_nomenclador)  
\`\`\`  
Esto asegura que nunca se pierda un código nuevo.

\#\#\# Escalabilidad multi-departamento  
\- El filtro de Departamento del módulo Admin debe ser dinámico  
\- Cuando se agregue Laboratorio, aparece automáticamente en el filtro  
\- Cada departamento puede tener sus propios códigos pero comparte las tablas de obras sociales e intermediarias (que son las mismas para todo el sanatorio)

\---

\#\# 11\. ORDEN DE IMPLEMENTACIÓN

1\. Configurar roles en Supabase Auth (admin, coordinador\_datos)  
2\. Agregar sección Administración al sidebar (visible según rol)  
3\. Implementar filtros globales (departamento, servicio, estado, buscador)  
4\. Pestaña Códigos de estudio — tabla con edición inline  
5\. Pestaña Obras sociales — tabla con indicador de progreso  
6\. Pestaña Intermediarias — tabla simple  
7\. Pestaña Sedes — tabla simple  
8\. Sistema de alertas de códigos nuevos (detección automática)  
9\. Historial de cambios  
10\. Email de notificación automática

\---  
\*Documento — Imalá — Proyecto BI Sanatorio Santa Fe — Mayo 2026\*  
\*Módulo de Administración y Saneamiento — Especificación completa\*  
