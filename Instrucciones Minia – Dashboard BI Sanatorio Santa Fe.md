\# INSTRUCCIONES MINIA — Dashboard BI Sanatorio Santa Fe  
\#\# Para Antigravity: implementación completa de la interfaz

\---

\#\# 1\. CONTEXTO GENERAL

Estamos construyendo un dashboard gerencial (BI) usando la plantilla \*\*Minia\*\* empaquetado como PWA.

El sistema está diseñado para crecer modularmente: hoy implementamos el primer departamento (Diagnóstico por Imágenes), pero la arquitectura debe contemplar desde el inicio que se van a agregar más departamentos del sanatorio (Laboratorio, Medicina Nuclear, Plan de Salud, Oncología, etc.).

\*\*Fuente de datos\*\*: exclusivamente las vistas Gold de Supabase via Supabase API con anon key. Nunca conectar directamente a la API del sanatorio ni a GECLISA.

\---

\#\# 2\. AUTENTICACIÓN — LOGIN Y REGISTRO

Implementar usando las \*\*plantillas de autenticación de Minia\*\* (no crear pantallas custom).

\#\#\# Pantalla de Login  
\- Usar la plantilla de login de Minia  
\- Campos: email \+ contraseña  
\- Botón "Ingresar"  
\- Link "¿Olvidaste tu contraseña?" → flujo de recuperación de Minia  
\- NO incluir registro público — los usuarios los crea el administrador  
\- Branding: logo del Grupo Santa Fe \+ "Sistema BI — Sanatorio Santa Fe"  
\- Autenticación via Supabase Auth

\#\#\# Pantalla de Recuperación de Contraseña  
\- Usar la plantilla de Minia  
\- Flujo estándar: email → link de reset → nueva contraseña

\#\#\# Roles de usuario (para contemplar desde el inicio)  
\- \*\*Admin\*\*: acceso a todos los departamentos \+ configuración  
\- \*\*Director\*\*: acceso a todos los departamentos, solo lectura  
\- \*\*Jefe de departamento\*\*: acceso solo a su departamento asignado  
\- Los roles se asignan en Supabase Auth con custom claims

\#\#\# Sesión  
\- Mantener sesión activa (remember me por defecto)  
\- Timeout de sesión: 8 horas  
\- Redirect automático al login si el token expira

\---

\#\# 3\. ESTRUCTURA DE NAVEGACIÓN (multi-departamento desde el inicio)

\#\#\# Sidebar principal  
La navegación debe estar preparada para múltiples departamentos aunque por ahora solo Diagnóstico por Imágenes tenga contenido.

\`\`\`  
SIDEBAR:  
─────────────────────────────  
  🏥 BI Sanatorio Santa Fe  
─────────────────────────────  
  📊 Resumen General          ← futuro (cuando haya más departamentos)

  DEPARTAMENTOS  
  ├── 🔬 Diagnóstico por Imágenes   ← ACTIVO HOY  
  │   ├── Cantidades  
  │   ├── Por Obra Social  
  │   └── Por Intermediaria  
  │  
  ├── 🧪 Laboratorio               ← PRÓXIMAMENTE (deshabilitado, visible)  
  ├── ⚛️  Medicina Nuclear          ← PRÓXIMAMENTE (deshabilitado, visible)  
  ├── 💊 Plan de Salud             ← PRÓXIMAMENTE (deshabilitado, visible)  
  ├── 💉 Oncología                 ← PRÓXIMAMENTE (deshabilitado, visible)  
  └── 🏥 Otros departamentos...    ← PRÓXIMAMENTE

  CONFIGURACIÓN  
  └── ⚙️  Administración           ← solo rol Admin  
─────────────────────────────  
  👤 \[nombre usuario\]  
  📅 Última sync: hace X horas  
─────────────────────────────  
\`\`\`

\#\#\# Comportamiento de los departamentos deshabilitados  
\- Aparecen en el sidebar con estilo "coming soon" (texto gris, badge "Próximamente")  
\- No son clickeables  
\- Esto permite que la dirección vea el roadmap del sistema

\#\#\# Header  
\- Nombre del departamento activo  
\- Selector de rango de fechas (global, aplica a todos los gráficos de la página)  
\- Indicador de última sincronización (leer de \`logs.log\_sincronizacion\`)

\---

\#\# 4\. PÁGINA PRINCIPAL — DIAGNÓSTICO POR IMÁGENES

\#\#\# 4.1 KPIs superiores (tarjetas de resumen)  
Cuatro tarjetas en la parte superior de la página:

| Tarjeta | Métrica | Vista Gold |  
|---------|---------|------------|  
| Total Estudios | Suma del período seleccionado | gold (todas las vistas) |  
| Videoendoscopías | Total del período | gold\_vw\_di\_video\_por\_mes o equivalente |  
| Tomografías | Total del período | gold\_vw\_di\_tomo\_por\_mes o equivalente |  
| Resonancias | Total del período | gold\_vw\_di\_resonancia\_por\_mes o equivalente |

Cada tarjeta muestra:  
\- Número grande (cantidad total)  
\- Variación % vs mismo período año anterior (▲ verde / ▼ rojo)  
\- Nombre del período activo

\#\#\# 4.2 Gráfico principal — "Cantidades por mes"  
Este es el gráfico más importante según la dirección.

\*\*Tipo\*\*: Líneas  
\*\*Comparación\*\*: múltiples años en el mismo gráfico (ej: 2024 azul claro, 2025 azul oscuro, 2026 verde)  
\*\*Eje X\*\*: meses (Ene — Dic)  
\*\*Eje Y\*\*: cantidad de estudios

\*\*Selector de servicio\*\* (encima del gráfico):  
\- Botones tipo toggle: \[ Todos \] \[ Video \] \[ Tomo \] \[ Resonancia \]  
\- Al seleccionar uno, el gráfico muestra solo ese servicio  
\- "Todos" suma los tres servicios

\*\*Selector de años a comparar\*\*:  
\- Checkboxes para seleccionar qué años mostrar  
\- Por defecto: los últimos 2 años disponibles

\*\*Comportamiento\*\*:  
\- Sin recargar la página al cambiar selector  
\- Animación suave al cambiar datos  
\- Tooltip al hover: mes, año, cantidad exacta, variación vs año anterior

\#\#\# 4.3 Gráfico — "Por Obra Social"  
\*\*Tipo\*\*: Barras horizontales  
\*\*Datos\*\*: Top 10 obras sociales por cantidad de estudios en el período  
\*\*Filtros\*\*: período, servicio (Video/Tomo/Resonancia/Todos)  
\*\*Ordenamiento\*\*: de mayor a menor cantidad  
\*\*Tooltip\*\*: nombre completo \+ cantidad \+ % del total

\#\#\# 4.4 Gráfico — "Por Intermediaria"  
\*\*Tipo\*\*: Dona (donut chart)  
\*\*Datos\*\*: distribución por intermediaria (Cajas, Directas, IAPOS, IMSA, Plan de Salud, Particular)  
\*\*Centro del donut\*\*: total de estudios del período  
\*\*Leyenda\*\*: a la derecha con nombre limpio \+ cantidad \+ %  
\*\*Filtros\*\*: período, servicio

\#\#\# 4.5 Filtros globales de la página  
Panel de filtros aplicable a todos los gráficos simultáneamente:  
\- \*\*Período\*\*: selector de rango de fechas (mes/año inicio — mes/año fin)  
\- \*\*Año de comparación\*\*: checkboxes (2023, 2024, 2025, 2026\)  
\- \*\*Servicio\*\*: todos / videoendoscopía / tomografía / resonancia  
\- Botón "Aplicar filtros" \+ "Limpiar"

\---

\#\# 5\. CONEXIÓN A SUPABASE

\#\#\# Configuración  
\`\`\`javascript  
// Variables de entorno — NUNCA hardcodear  
SUPABASE\_URL=https://xxxxxxxxxxxx.supabase.co  
SUPABASE\_ANON\_KEY=sb\_publishable\_...  
\`\`\`

\#\#\# Vistas Gold disponibles (usar estas exactamente)  
Antes de implementar los gráficos, consultar a Supabase cuáles son los nombres exactos de las 10 vistas Gold que ya existen. Listarlas y mapear cada gráfico a su vista correspondiente.

\#\#\# Indicador de última sincronización  
Leer de \`logs.log\_sincronizacion\` el registro más reciente:  
\`\`\`sql  
SELECT ejecutado\_en, estado, filas\_insertadas  
FROM logs.log\_sincronizacion  
ORDER BY ejecutado\_en DESC  
LIMIT 1  
\`\`\`  
Mostrar en el footer del sidebar: "Última sync: hace X horas" o "Última sync: hoy a las HH:MM"

\---

\#\# 6\. DISEÑO Y UX

\#\#\# Paleta de colores (respetar los del sanatorio)  
\- Primario: \#185FA5 (azul)  
\- Éxito/positivo: \#5DCAA5 (verde teal)  
\- Alerta: \#EF9F27 (ámbar)  
\- Error/negativo: \#E05C5C (rojo)  
\- Fondo: usar los defaults de Minia (dark/light mode)

\#\#\# Colores por servicio (consistentes en todos los gráficos)  
\- Videoendoscopía: \#185FA5 (azul)  
\- Tomografía: \#EF9F27 (ámbar)  
\- Resonancia: \#7F77DD (violeta)  
\- Total/Todos: \#5DCAA5 (verde)

\#\#\# Responsive  
\- El dashboard debe funcionar en desktop y tablet  
\- En mobile: sidebar colapsable, gráficos en una columna

\#\#\# Loading states  
\- Skeleton loaders mientras cargan los datos de Supabase  
\- Mensaje de error si falla la conexión

\#\#\# Modo oscuro / claro  
\- Usar el toggle de Minia nativo

\---

\#\# 7\. CONSIDERACIONES TÉCNICAS

\#\#\# Performance  
\- Las vistas Gold de Supabase ya están optimizadas — no hacer queries pesados desde el frontend  
\- Implementar caché local de 5 minutos para evitar llamadas repetidas con los mismos filtros

\#\#\# PWA  
\- Configurar manifest.json con:  
  \- nombre: "BI Sanatorio Santa Fe"  
  \- short\_name: "BI GSF"  
  \- icon: usar el logo del Grupo Santa Fe  
  \- theme\_color: \#185FA5  
  \- display: standalone

\#\#\# Escalabilidad multi-departamento  
\- El componente de gráficos debe ser parametrizable: recibe el schema/vista como prop, no tiene los nombres hardcodeados  
\- El sidebar debe leer la lista de departamentos de una configuración, no estar hardcodeado  
\- Cuando se active un nuevo departamento, solo se actualiza la configuración, no el código

\---

\#\# 8\. ORDEN DE IMPLEMENTACIÓN

1\. Setup del proyecto Minia \+ conexión a Supabase  
2\. Pantalla de Login (plantilla Minia \+ Supabase Auth)  
3\. Pantalla de Recuperación de contraseña  
4\. Layout base: sidebar \+ header \+ área de contenido  
5\. Sidebar con estructura multi-departamento (DI activo, resto "Próximamente")  
6\. KPIs superiores conectados a Gold  
7\. Gráfico principal "Cantidades por mes"  
8\. Gráfico "Por Obra Social"  
9\. Gráfico "Por Intermediaria"  
10\. Filtros globales  
11\. Indicador de última sincronización  
12\. Configuración PWA

\---

\#\# 9\. LO QUE NO HACER

\- NO conectar directamente a la API del sanatorio desde el frontend  
\- NO hardcodear credenciales en el código  
\- NO crear pantallas de login custom — usar las plantillas de Minia  
\- NO hacer queries directos a las tablas Bronze o Silver desde el frontend  
\- NO bloquear navegación con spinners que bloqueen toda la pantalla

\---  
\*Documento preparado por Imalá — Proyecto BI Sanatorio Santa Fe — Mayo 2026\*  
