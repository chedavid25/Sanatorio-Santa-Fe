\# CONTEXTO DEL PROYECTO — BI Sanatorio Santa Fe  
\#\# Para usar con Antigravity: adjuntar este documento al inicio de cada sesión  
\#\# Versión 2 — Mayo 2026

\---

\#\# 1\. QUIÉNES SOMOS

\- \*\*Imalá\*\*: empresa de desarrollo que construye el sistema. Rol: arquitectura, desarrollo, deployment.  
\- \*\*Sanatorio Santa Fe / Grupo Santa Fe (UGSFE)\*\*: cliente. Institución médica con múltiples sedes en Santa Fe, Argentina.  
\- \*\*Macarena\*\*: referente funcional del sanatorio. Define qué gráficos y KPIs se necesitan. No tiene perfil técnico.  
\- \*\*Daniel\*\*: responsable de informática del sanatorio. Conoce GECLISA y construyó la API de estadísticas.

\---

\#\# 2\. OBJETIVO DEL SISTEMA

Desarrollar un \*\*dashboard gerencial de Business Intelligence (BI)\*\* empaquetado como PWA usando la plantilla \*\*Minia\*\*.

Estrategia comercial: desarrollo modular por departamento médico.  
\- Setup Fee inicial (core \+ primer departamento)  
\- Pago único por cada módulo adicional  
\- Fee mensual de mantenimiento

\---

\#\# 3\. ESTRUCTURA ORGANIZACIONAL DEL SANATORIO (UGSFE)

El sanatorio tiene los siguientes departamentos — todos son módulos futuros del sistema:

\*\*Columna A (actuales/prioritarios):\*\*  
\- RT — Sanatorio Santa Fe Adultos  
\- JF — Sanatorio Santa Fe Niños  
\- IRS — Diagnóstico por Imágenes ← FASE 1 ACTIVA  
\- EC — Laboratorio Santa Fe  
\- DC — Medicina Nuclear  
\- ET — Plan de Salud  
\- VG — Unidad Oncológica / Unidad Infusión  
\- TS — Centro de Investigación  
\- VS — Medicina Laboral

\*\*Columna B (futuros):\*\*  
\- LDG — Sedes de Atención Ambulatoria  
\- JL — Internación Domiciliaria  
\- VE — Fundación  
\- SF — Unidad de Docencia e Investigación  
\- GM — Unidad de Calidad y Seguridad del Paciente  
\- MV — Club de Campo  
\- VR — Unidad Cultural, Recreativa y Social  
\- CE — Unidad de Traslado  
\- NF — Auditorio

\---

\#\# 4\. FASE 1: DIAGNÓSTICO POR IMÁGENES

\#\#\# Sub-servicios completos de DI (20 servicios):  
1\. DENSITOMETRIA OSEA  
2\. ECODOPPLER CARDIACO  
3\. ECODOPPLER CARDIACO ESPERANZA  
4\. ECODOPPLER CARDIACO GRAL PAZ  
5\. ECODOPPLER CARDIACO STO TOME  
6\. ECOGRAFÍAS  
7\. ECOGRAFÍAS CLINICA ESPERANZA  
8\. ECOGRAFÍAS CLINICA STO TOME  
9\. ECOGRAFÍAS GENERAL PAZ  
10\. ECOGRAFÍAS SAN LUIS  
11\. IMAGENES ODONTOLOGICAS  
12\. MEDICINA NUCLEAR  
13\. RADIOLOGIA DIGITAL  
14\. RADIOLOGIA DIGITAL URGENCIAS  
15\. RADIOLOGIA SAN LUIS  
16\. RESONANCIA IMAGENES  
17\. RX CLINICA ESPERANZA  
18\. RX CLINICA SANTO TOME  
19\. TOMOGRAFÍA COMPUTADA  
20\. VIDEOENDOSCOPIA

\#\#\# Acceso actual via API (primeros servicios disponibles):  
\- Videoendoscopía → /api/Video  
\- Tomografía → /api/Tomo  
\- Resonancia → /api/Resonancia  
\- Daniel irá ampliando la API con los demás servicios progresivamente.

\#\#\# Sedes del sanatorio:  
\- SANATORIO SANTA FE (sede principal)  
\- SANTO TOME  
\- ESPERANZA  
\- SAN LUIS  
\- GENERAL PAZ  
\- CEMI  
\- (otras a confirmar con Daniel)

\---

\#\# 5\. FUENTES DE DATOS

\#\#\# 5.1 Sistema origen: GECLISA  
\- Sistema monolítico on-premise. Motor: Microsoft SQL Server.  
\- Problema principal: alta inconsistencia en carga manual.  
\- Tablas core: MovEnca, MovPrac, Nomenclador, Servicios, Solicitantes, OsTraductor, Informes.

\#\#\# 5.2 API REST: EstadisticasApi  
\- Base URL: https://apiestadisticas.gruposantafe.com.ar/  
\- Autenticación: JWT Bearer Token (60 minutos de validez).  
\- Login: POST https://identityout.gruposantafe.com.ar/api/Auth/login  
\- Body: { "email": "...", "password": "..." }  
\- Endpoints disponibles hoy:  
  \- GET /api/Video | /api/Video/total-por-fecha | /api/Video/total-por-Intermediaria | /api/Video/total-por-os  
  \- GET /api/Tomo | /api/Tomo/total-por-fecha | /api/Tomo/total-por-intermediaria | /api/Tomo/total-por-os  
  \- GET /api/Resonancia | /api/Resonancia/total-por-fecha | /api/Resonancia/total-por-intermediaria | /api/Resonancia/total-por-os  
\- Parámetros requeridos: fechaDesde (YYYY-MM-DD), fechaHasta (YYYY-MM-DD)  
\- Modelo de respuesta: { servicio, intermediaria, obraSocial, anio, mes, cantidad }  
\- IMPORTANTE: datos NO saneados. El saneamiento ocurre en la capa Silver de Supabase.

\---

\#\# 6\. ARQUITECTURA: ELT CON 3 CAPAS EN SUPABASE

\#\#\# Flujo general  
API Sanatorio → Script Python → Supabase Bronze → Silver → Gold → Dashboard Minia

El dashboard NUNCA consulta la API del sanatorio directamente. Solo lee Gold.

\#\#\# Estructura de schemas en Supabase (diseño escalable por departamento)

\`\`\`  
NIVEL 1: schema \= departamento médico  
NIVEL 2: tablas \= servicio dentro del departamento

schema: diagnostico\_imagenes        ← FASE 1 ACTIVA  
  bronze\_videoendoscopia  
  bronze\_tomografia  
  bronze\_resonancia  
  bronze\_ecografia                  (cuando Daniel agregue a la API)  
  bronze\_radiologia                 (futuro)  
  bronze\_densitometria              (futuro)  
  silver\_videoendoscopia  
  silver\_tomografia  
  silver\_resonancia  
  silver\_ecografia                  (futuro)  
  ... (un silver por cada bronze)

schema: laboratorio                 (futuro)  
schema: medicina\_nuclear            (futuro)  
schema: plan\_de\_salud               (futuro)  
schema: oncologia                   (futuro)  
schema: medicina\_laboral            (futuro)  
... (un schema por cada departamento de UGSFE)

schema: silver\_shared               ← equivalencias compartidas entre TODOS los departamentos  
  silver\_os\_equivalencias           (os\_nombre\_crudo → os\_nombre\_limpio)  
  silver\_intermediaria\_equivalencias  
  silver\_codigos\_nomenclador        (codigo, nombre\_original, servicio, es\_estudio, excluir, nombre\_unificado)  
  silver\_sedes\_equivalencias        (servicio\_crudo → servicio\_limpio, sede)

schema: gold                        ← TODAS las vistas Gold de TODOS los departamentos  
  gold\_vw\_di\_video\_por\_mes  
  gold\_vw\_di\_video\_por\_os  
  gold\_vw\_di\_tomo\_por\_mes  
  gold\_vw\_di\_resonancia\_por\_mes  
  ... (una vista por KPI)  
  gold\_vw\_total\_sanatorio           (futuro — cruza todos los departamentos)

schema: logs  
  log\_sincronizacion  
\`\`\`

\#\#\# Por qué esta estructura  
\- Un schema por departamento refleja la organización real del sanatorio.  
\- Agregar un departamento nuevo \= crear un schema nuevo sin tocar nada existente.  
\- Silver\_shared evita duplicar las equivalencias de obras sociales en cada departamento.  
\- Gold centralizado permite vistas que cruzan departamentos (KPIs globales del sanatorio).

\#\#\# Las 3 capas en detalle

\*\*BRONZE\*\*  
\- Recibe exactamente lo que devuelve la API, sin modificaciones.  
\- Campos: id (serial PK), servicio, intermediaria, obra\_social, anio, mes, cantidad, sync\_timestamp.  
\- Solo INSERT, nunca UPDATE ni DELETE.

\*\*SILVER\*\*  
\- Lee Bronze y aplica reglas de normalización usando las tablas de silver\_shared.  
\- Campos adicionales sobre Bronze: os\_nombre\_limpio, intermediaria\_limpia, nombre\_estudio\_unificado, sede.  
\- Las tablas de equivalencias son editables sin tocar código.

\*\*GOLD\*\*  
\- Vistas SQL que leen Silver y calculan métricas.  
\- Naming: gold\_vw\_{departamento}\_{servicio}\_{agrupacion}  
  \- ej: gold\_vw\_di\_video\_por\_mes, gold\_vw\_di\_video\_por\_os  
\- Son las ÚNICAS tablas que consulta el dashboard.

\#\#\# Script Python de sincronización  
\- Se ejecuta cada 6 horas.  
\- Autentica en API → llama endpoints con fechaDesde \= última fecha sincronizada → inserta en Bronze → ejecuta proceso Silver.  
\- Registra en log\_sincronizacion: timestamp, departamento, servicio, filas\_insertadas, estado (OK/ERROR), mensaje\_error.  
\- Credenciales siempre desde variables de entorno.  
\- El dashboard muestra "última sincronización hace X horas".

\---

\#\# 7\. SANEAMIENTO DE DATOS

\#\#\# Fuente  
Excel "Estructura\_y\_Códigos\_por\_servicio.xlsx" — 4 hojas: VIDEO, ECO, RESO, TAC.

\#\#\# Estructura de cada hoja  
\- Codigo: código numérico del nomenclador GECLISA  
\- Nombre: nombre original en GECLISA  
\- Estudio (TRUE/FALSE): si debe contarse como estudio en KPIs  
\- No es estudio (TRUE/FALSE): si debe excluirse  
\- Mal cargado (TRUE/FALSE): si está en el servicio equivocado, también excluir  
\- Unificación de Nombre: nombre limpio para el dashboard

\#\#\# Regla de exclusión en Silver  
excluir \= TRUE cuando: "No es estudio" \= TRUE OR "Mal cargado" \= TRUE

\#\#\# Sedes (hoja ECO)  
Columnas adicionales: Servicios (nombre crudo), Unificar (nombre limpio), Sede (sede física).  
Sedes identificadas: SANATORIO SANTA FE, SANTO TOME, ESPERANZA, SAN LUIS, GENERAL PAZ, CEMI.

\---

\#\# 8\. DASHBOARD

\- Plantilla: Minia (PWA)  
\- Solo consulta vistas Gold de Supabase via Supabase API (anon key).  
\- Gráfico principal: "Cantidades"  
  \- Líneas comparativo por mes  
  \- Selector de métrica dinámico (sin recargar página)  
  \- Filtros: Año, Mes/Período, Obra Social, Servicio, Área (Ambulatorio/Internado), Sede  
\- Resto de KPIs en relevamiento (ver Google Sheet).

\---

\#\# 9\. CONVENCIONES DE NOMENCLATURA

\#\#\# Schemas  
\- Por departamento: nombre\_departamento (ej: diagnostico\_imagenes, laboratorio)  
\- Compartidos: silver\_shared, gold, logs

\#\#\# Tablas Bronze  
\- bronze\_{servicio} dentro del schema del departamento  
\- ej: diagnostico\_imagenes.bronze\_videoendoscopia

\#\#\# Tablas Silver  
\- silver\_{servicio} dentro del schema del departamento  
\- ej: diagnostico\_imagenes.silver\_videoendoscopia

\#\#\# Tablas de equivalencias (en silver\_shared)  
\- silver\_os\_equivalencias  
\- silver\_intermediaria\_equivalencias  
\- silver\_codigos\_nomenclador  
\- silver\_sedes\_equivalencias

\#\#\# Vistas Gold (en schema gold)  
\- gold\_vw\_{departamento}\_{servicio}\_{agrupacion}  
\- ej: gold\_vw\_di\_video\_por\_mes, gold\_vw\_di\_tomo\_por\_os

\#\#\# Variables de entorno  
\- API\_BASE\_URL  
\- API\_IDENTITY\_URL  
\- API\_EMAIL  
\- API\_PASSWORD  
\- SUPABASE\_URL  
\- SUPABASE\_SERVICE\_KEY  
\- SUPABASE\_ANON\_KEY

\#\#\# Reglas generales  
\- Nunca hardcodear credenciales.  
\- Nunca el dashboard consulta fuera de Gold.  
\- Siempre loguear en log\_sincronizacion.  
\- Las equivalencias son editables sin tocar código.  
\- Una tarea por sesión de Antigravity.

\---

\#\# 10\. GOOGLE SHEET DE RELEVAMIENTO

\- URL: https://docs.google.com/spreadsheets/d/1sG-8OsWG6dtBJkHw7JWzKlvJfCx2y4O-uOvLMTaUCEo  
\- Lo completan Macarena (funcional) \+ Daniel (técnico).  
\- Estado: en progreso.

\---

\#\# 11\. ESTADO ACTUAL (Mayo 2026\)

✅ Documentación API EstadisticasApi v1.0.0 recibida  
✅ Excel saneamiento de códigos armado (VIDEO, ECO, RESO, TAC)  
✅ Google Sheet de relevamiento creado y en progreso  
✅ Arquitectura definida y validada  
✅ Estructura organizacional UGSFE documentada (18 departamentos)  
✅ 20 sub-servicios de DI identificados  
⬜ Supabase: proyecto a crear (región: South America São Paulo)  
⬜ Supabase: schemas y tablas Bronze/Silver a implementar  
⬜ silver\_shared: tablas de equivalencias a crear y cargar con Excel  
⬜ Script Python de sincronización a desarrollar  
⬜ Primera sincronización real desde la API  
⬜ Vistas Gold a desarrollar  
⬜ Dashboard Minia a conectar

\---

\#\# 12\. PRÓXIMOS PASOS (orden de ejecución)

1\. Crear proyecto Supabase (región: South America São Paulo)  
2\. Crear schema diagnostico\_imagenes con tablas Bronze para Video, Tomo, Resonancia  
3\. Crear schema silver\_shared con tablas de equivalencias  
4\. Crear schema gold y schema logs  
5\. Desarrollar script Python de sincronización con JWT y log  
6\. Primera sincronización de datos reales  
7\. Cargar Excel de saneamiento en silver\_codigos\_nomenclador  
8\. Crear vistas Gold para primeros KPIs  
9\. Conectar dashboard Minia a Gold  
10\. Validar con Macarena y Daniel  
11\. Iterar con nuevos servicios a medida que Daniel amplía la API

\---  
\*Documento v2 — Imalá — Proyecto BI Sanatorio Santa Fe — Mayo 2026\*  
\*Mantener actualizado a medida que avanza el proyecto.\*  
