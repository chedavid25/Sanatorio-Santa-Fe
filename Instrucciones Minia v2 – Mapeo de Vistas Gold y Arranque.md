\# INSTRUCCIONES MINIA v2 — Mapeo de Vistas Gold y Arranque  
\#\# Para Antigravity: implementación paso a paso

\---

\#\# 1\. VISTAS GOLD CONFIRMADAS EN SUPABASE

Estas son las 10 vistas exactas disponibles. Usar SIEMPRE estos nombres, nunca hardcodear queries propios.

\#\#\# Vistas por mes (para KPIs y gráfico de líneas)  
| Vista | Uso |  
|-------|-----|  
| \`gold\_vw\_di\_resumen\_por\_mes\` | KPI Total Estudios \+ gráfico comparativo general |  
| \`gold\_vw\_di\_video\_por\_mes\` | KPI Videoendoscopía \+ línea Video en gráfico |  
| \`gold\_vw\_di\_tomo\_por\_mes\` | KPI Tomografía \+ línea Tomo en gráfico |  
| \`gold\_vw\_di\_resonancia\_por\_mes\` | KPI Resonancia \+ línea Resonancia en gráfico |

\#\#\# Vistas por obra social (para gráfico de barras horizontales)  
| Vista | Uso |  
|-------|-----|  
| \`gold\_vw\_di\_video\_por\_os\` | Barras obras sociales — Video |  
| \`gold\_vw\_di\_tomo\_por\_os\` | Barras obras sociales — Tomo |  
| \`gold\_vw\_di\_resonancia\_por\_os\` | Barras obras sociales — Resonancia |

\#\#\# Vistas por intermediaria (para gráfico de dona)  
| Vista | Uso |  
|-------|-----|  
| \`gold\_vw\_di\_video\_por\_intermediaria\` | Dona intermediaria — Video |  
| \`gold\_vw\_di\_tomo\_por\_intermediaria\` | Dona intermediaria — Tomo |  
| \`gold\_vw\_di\_resonancia\_por\_intermediaria\` | Dona intermediaria — Resonancia |

\#\#\# Lógica del selector "Todos"  
Cuando el usuario selecciona "Todos los servicios":  
\- Gráfico de líneas: sumar \`gold\_vw\_di\_resumen\_por\_mes\`  
\- Barras OS: sumar las 3 vistas de OS y agrupar por obra social  
\- Dona: sumar las 3 vistas de intermediaria y agrupar por intermediaria

\---

\#\# 2\. ESTRUCTURA DE CAMPOS EN LAS VISTAS

Antes de implementar los gráficos, hacer un SELECT a cada vista para confirmar los nombres exactos de columnas. El patrón esperado es:

\#\#\# Vistas \_por\_mes  
\`\`\`  
anio integer  
mes integer  
cantidad integer  
servicio text (opcional)  
\`\`\`

\#\#\# Vistas \_por\_os  
\`\`\`  
os\_nombre\_limpio text   ← campo normalizado de Silver  
cantidad integer  
anio integer (opcional)  
\`\`\`

\#\#\# Vistas \_por\_intermediaria  
\`\`\`  
intermediaria\_limpia text   ← campo normalizado de Silver  
cantidad integer  
anio integer (opcional)  
\`\`\`

\---

\#\# 3\. ORDEN DE IMPLEMENTACIÓN — SEGUIR ESTE ORDEN EXACTO

\#\#\# Paso 1 — Setup del proyecto  
\- Instalar/configurar plantilla Minia  
\- Conectar Supabase con variables de entorno:  
  \`\`\`  
  SUPABASE\_URL=  
  SUPABASE\_ANON\_KEY=  
  \`\`\`  
\- Verificar que la anon key puede leer las vistas Gold  
\- Configurar Supabase Auth

\#\#\# Paso 2 — Autenticación  
\- Implementar login usando plantilla de Minia (NO crear pantalla custom)  
\- Implementar recuperación de contraseña usando plantilla de Minia  
\- Conectar con Supabase Auth  
\- Branding: "Sistema BI — Sanatorio Santa Fe" \+ logo GSF  
\- NO incluir registro público (los usuarios los crea el admin)  
\- Redirect automático al login si sesión expirada

\#\#\# Paso 3 — Layout base  
\- Implementar sidebar con estructura multi-departamento:

\`\`\`  
SIDEBAR:  
─────────────────────────────  
  🏥 BI Sanatorio Santa Fe  
─────────────────────────────  
  DEPARTAMENTOS  
  ├── 🔬 Diagnóstico por Imágenes   ← ACTIVO, clickeable  
  │   ├── Cantidades  
  │   ├── Por Obra Social  
  │   └── Por Intermediaria  
  │  
  ├── 🧪 Laboratorio               ← Badge "Próximamente", NO clickeable  
  ├── ⚛️  Medicina Nuclear          ← Badge "Próximamente", NO clickeable  
  ├── 💊 Plan de Salud             ← Badge "Próximamente", NO clickeable  
  ├── 💉 Oncología                 ← Badge "Próximamente", NO clickeable  
  └── ➕ Más departamentos...      ← Badge "Próximamente", NO clickeable

  CONFIGURACIÓN  
  └── ⚙️  Administración           ← solo visible para rol Admin  
─────────────────────────────  
  👤 \[nombre del usuario\]  
  🕐 Última sync: hace X horas    ← leer de logs.log\_sincronizacion  
─────────────────────────────  
\`\`\`

\- Los departamentos "Próximamente" aparecen en gris con badge visual  
\- La lista de departamentos debe venir de una configuración (array/objeto), NO hardcodeada en el HTML  
\- Así cuando se active un nuevo departamento, solo se edita la configuración

\- Header de página:  
  \- Nombre del departamento activo a la izquierda  
  \- Selector de período (fecha inicio — fecha fin) a la derecha  
  \- El selector de período aplica globalmente a todos los gráficos

\#\#\# Paso 4 — KPIs superiores (4 tarjetas)  
Cuatro tarjetas en la parte superior:

| \# | Tarjeta | Vista | Cálculo |  
|---|---------|-------|---------|  
| 1 | Total Estudios | \`gold\_vw\_di\_resumen\_por\_mes\` | SUM(cantidad) del período |  
| 2 | Videoendoscopías | \`gold\_vw\_di\_video\_por\_mes\` | SUM(cantidad) del período |  
| 3 | Tomografías | \`gold\_vw\_di\_tomo\_por\_mes\` | SUM(cantidad) del período |  
| 4 | Resonancias | \`gold\_vw\_di\_resonancia\_por\_mes\` | SUM(cantidad) del período |

Cada tarjeta:  
\- Número grande (total del período)  
\- Variación % vs mismo período año anterior (▲ verde si sube / ▼ rojo si baja)  
\- Skeleton loader mientras carga

\#\#\# Paso 5 — Gráfico principal "Cantidades por mes"  
\- Tipo: líneas  
\- Fuente de datos según selector de servicio:  
  \- Video → \`gold\_vw\_di\_video\_por\_mes\`  
  \- Tomo → \`gold\_vw\_di\_tomo\_por\_mes\`  
  \- Resonancia → \`gold\_vw\_di\_resonancia\_por\_mes\`  
  \- Todos → \`gold\_vw\_di\_resumen\_por\_mes\`  
\- Comparación de años: varias líneas en el mismo gráfico  
  \- Por defecto mostrar los últimos 2 años con datos disponibles  
  \- Colores: cada año tiene su propio color  
\- Selector de servicio: botones toggle \[ Todos | Video | Tomo | Resonancia \]  
  \- Colores: Video=\#185FA5, Tomo=\#EF9F27, Resonancia=\#7F77DD, Todos=\#5DCAA5  
\- Checkboxes para seleccionar qué años comparar  
\- Tooltip al hover: mes, año, cantidad, variación vs año anterior  
\- Sin recargar página al cambiar filtros

\#\#\# Paso 6 — Gráfico "Por Obra Social"  
\- Tipo: barras horizontales  
\- Fuente según selector de servicio (mismo toggle del Paso 5):  
  \- Video → \`gold\_vw\_di\_video\_por\_os\`  
  \- Tomo → \`gold\_vw\_di\_tomo\_por\_os\`  
  \- Resonancia → \`gold\_vw\_di\_resonancia\_por\_os\`  
  \- Todos → sumar las 3 vistas agrupando por os\_nombre\_limpio  
\- Mostrar Top 10 obras sociales del período  
\- Ordenar de mayor a menor  
\- Tooltip: nombre \+ cantidad \+ % del total  
\- Campo a usar: \`os\_nombre\_limpio\` (ya viene normalizado de Silver)

\#\#\# Paso 7 — Gráfico "Por Intermediaria"  
\- Tipo: dona (donut chart)  
\- Fuente según selector de servicio:  
  \- Video → \`gold\_vw\_di\_video\_por\_intermediaria\`  
  \- Tomo → \`gold\_vw\_di\_tomo\_por\_intermediaria\`  
  \- Resonancia → \`gold\_vw\_di\_resonancia\_por\_intermediaria\`  
  \- Todos → sumar las 3 vistas agrupando por intermediaria\_limpia  
\- Centro del donut: total de estudios del período  
\- Leyenda a la derecha: nombre limpio \+ cantidad \+ %  
\- Campo a usar: \`intermediaria\_limpia\` (ya normalizado de Silver)  
\- Colores: uno por intermediaria, consistentes siempre

\#\#\# Paso 8 — Indicador de última sincronización  
\`\`\`sql  
SELECT ejecutado\_en, estado, filas\_insertadas  
FROM logs.log\_sincronizacion  
ORDER BY ejecutado\_en DESC  
LIMIT 1  
\`\`\`  
\- Mostrar en sidebar: "Última sync: hace X horas" o "hoy a las HH:MM"  
\- Si estado \= ERROR: mostrar en rojo con ícono de alerta

\#\#\# Paso 9 — PWA  
\- manifest.json:  
  \- name: "BI Sanatorio Santa Fe"  
  \- short\_name: "BI GSF"  
  \- theme\_color: \#185FA5  
  \- display: standalone  
\- Service worker para funcionamiento offline básico

\---

\#\# 4\. PALETA DE COLORES

\`\`\`  
Primario:    \#185FA5  (azul — también color de Video)  
Tomo:        \#EF9F27  (ámbar)  
Resonancia:  \#7F77DD  (violeta)  
Total/Todos: \#5DCAA5  (verde teal)  
Error:       \#E05C5C  (rojo)  
Fondo claro: defaults de Minia  
\`\`\`

\---

\#\# 5\. REGLAS TÉCNICAS — NUNCA VIOLAR

\- NUNCA conectar directamente a la API del sanatorio desde el frontend  
\- NUNCA hardcodear credenciales en el código  
\- NUNCA usar plantillas de login custom — usar las de Minia  
\- NUNCA hacer queries a tablas Bronze o Silver desde el frontend  
\- NUNCA hardcodear la lista de departamentos en el HTML  
\- SIEMPRE usar skeleton loaders mientras cargan datos  
\- SIEMPRE leer \`os\_nombre\_limpio\` e \`intermediaria\_limpia\` de Gold (nunca los campos crudos)  
\- SIEMPRE que se cambie un filtro, actualizar todos los gráficos de la página simultáneamente

\---

\#\# 6\. COMPONENTE REUTILIZABLE PARA MULTI-DEPARTAMENTO

El componente de gráficos debe ser parametrizable. Ejemplo de configuración de departamento:

\`\`\`javascript  
const departamentos \= \[  
  {  
    id: 'diagnostico\_imagenes',  
    nombre: 'Diagnóstico por Imágenes',  
    icono: '🔬',  
    activo: true,  
    vistas: {  
      resumen\_por\_mes: 'gold\_vw\_di\_resumen\_por\_mes',  
      video\_por\_mes: 'gold\_vw\_di\_video\_por\_mes',  
      tomo\_por\_mes: 'gold\_vw\_di\_tomo\_por\_mes',  
      resonancia\_por\_mes: 'gold\_vw\_di\_resonancia\_por\_mes',  
      video\_por\_os: 'gold\_vw\_di\_video\_por\_os',  
      tomo\_por\_os: 'gold\_vw\_di\_tomo\_por\_os',  
      resonancia\_por\_os: 'gold\_vw\_di\_resonancia\_por\_os',  
      video\_por\_intermediaria: 'gold\_vw\_di\_video\_por\_intermediaria',  
      tomo\_por\_intermediaria: 'gold\_vw\_di\_tomo\_por\_intermediaria',  
      resonancia\_por\_intermediaria: 'gold\_vw\_di\_resonancia\_por\_intermediaria',  
    }  
  },  
  {  
    id: 'laboratorio',  
    nombre: 'Laboratorio',  
    icono: '🧪',  
    activo: false,  // ← cuando se active, solo cambiar a true y agregar vistas  
    vistas: {}  
  },  
  {  
    id: 'medicina\_nuclear',  
    nombre: 'Medicina Nuclear',  
    icono: '⚛️',  
    activo: false,  
    vistas: {}  
  },  
  // ... resto de departamentos  
\]  
\`\`\`

Cuando Daniel agregue un nuevo servicio a la API y se creen las vistas Gold correspondientes, solo se agrega el objeto al array y se pone \`activo: true\`. Sin tocar componentes.

\---  
\*Documento v2 — Imalá — Proyecto BI Sanatorio Santa Fe — Mayo 2026\*  
