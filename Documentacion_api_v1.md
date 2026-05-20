# EstadísticasApi — Documentación Técnica

**Versión:** 1.0.0  
**Fecha:** Mayo 2026  
**Autor:** Oficina de Informática - Grupo Santafé

---

## Información General

| Propiedad | Valor |
|-----------|-------|
| **Base URL** | `https://apiestadisticas.gruposantafe.com.ar/` |
| **Protocolo** | HTTPS |
| **Formato** | JSON |
| **Autenticación** | JWT Bearer Token |
| **Especificación** | OpenAPI 3.1.1 |

### Descripción

Esta API REST provee estadísticas de estudios médicos. Permite consultar:
- Videoendoscopias
- Tomografías
- Resonancias Magnéticas

Las consultas pueden filtrarse por rango de fechas, desagregadas por período, intermediaria y obra social. 

**Requisito:** Todos los endpoints están protegidos con JWT y requieren autenticación previa a través de la API de Identity.

---

## Módulos Disponibles

| Módulo | Prefijo | Descripción | Endpoints |
|--------|---------|-------------|-----------|
| **Auth** | `/api/Auth` | Autenticación y obtención de token JWT | 1 |
| **Video** | `/api/Video` | Estudios de videoendoscopía | 4 |
| **Tomo** | `/api/Tomo` | Estudios de tomografía | 4 |
| **Resonancia** | `/api/Resonancia` | Estudios de resonancia magnética | 4 |

---

## Autenticación

### `POST /api/Auth/login`

Autentica al usuario y devuelve un token JWT con validez de **60 minutos**.

**Base URL de Identity:**
```
https://identityout.gruposantafe.com.ar/api/Auth/login
```

#### Body del Request

```json
{
  "email": "usuario@dominio.com",
  "password": "contraseña"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | Sí | Email del usuario registrado en el sistema |
| `password` | string | Sí | Contraseña del usuario |

#### Respuesta Exitosa (200 OK)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "roles": [
    "Admin"
  ],
  "user": {
    "id": "be5bbf73-3faa-494f-b9d2-63ac616320a7",
    "email": "usuario@dominio.com",
    "userName": "usuario@dominio.com"
  }
}
```

### Cómo usar el token en los requests

Una vez obtenido el token, incluirlo en el header `Authorization` de cada request a la API de estadísticas.

#### Header Requerido

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Ejemplo con cURL

```bash
# 1. Autenticarse
curl -X POST https://identityout.gruposantafe.com.ar/api/Auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@dominio.com", "password": "pass"}'

# 2. Usar el token obtenido en consultas protegidas
curl -X GET "https://apiestadisticas.gruposantafe.com.ar/api/Video?fechaDesde=2024-01-01&fechaHasta=2024-12-31" \
  -H "Authorization: Bearer {TOKEN}"
```

#### Ejemplo con C# HttpClient

```csharp
// 1. Login y obtener token
var loginRes = await client.PostAsJsonAsync(
  "https://identityout.gruposantafe.com.ar/api/Auth/login",
  new { email = "usuario@dominio.com", password = "pass" }
);

var token = (await loginRes.Content.ReadFromJsonAsync<LoginResponse>()).Token;

// 2. Usar el token en requests protegidos
client.DefaultRequestHeaders.Authorization = 
  new AuthenticationHeaderValue("Bearer", token);

var res = await client.GetAsync(
  "/api/Video?fechaDesde=2024-01-01&fechaHasta=2024-12-31"
);

var data = await res.Content.ReadFromJsonAsync<List<Videoendoscopia>>();
```

---

## Módulo: Video (Videoendoscopía)

### `GET /api/Video`

Retorna el total de videoendoscopías agrupadas por servicio, año y mes para el rango de fechas indicado.

**Requiere autenticación JWT** — incluir header: `Authorization: Bearer {token}`

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Formato | Ejemplo |
|-----------|------|-----------|---------|---------|
| `fechaDesde` | string (date-time) | Sí | YYYY-MM-DD | 2024-01-01 |
| `fechaHasta` | string (date-time) | Sí | YYYY-MM-DD | 2024-12-31 |

#### Respuesta Exitosa (200 OK)

```json
[
  {
    "servicio": "VIDEOENDOSCOPIA",
    "intermediaria": null,
    "obraSocial": null,
    "anio": 2024,
    "mes": 1,
    "cantidad": 142
  }
]
```

---

### `GET /api/Video/total-por-fecha`

Retorna el total acumulado de videoendoscopías agrupado por servicio para el rango de fechas indicado.

**Requiere autenticación JWT** — incluir header: `Authorization: Bearer {token}`

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Formato | Ejemplo |
|-----------|------|-----------|---------|---------|
| `fechaDesde` | string (date-time) | Sí | YYYY-MM-DD | 2024-01-01 |
| `fechaHasta` | string (date-time) | Sí | YYYY-MM-DD | 2024-12-31 |

#### Respuesta Exitosa (200 OK)

```json
[
  {
    "servicio": "VIDEOENDOSCOPIA",
    "intermediaria": null,
    "obraSocial": null,
    "anio": 0,
    "mes": 0,
    "cantidad": 2343
  }
]
```

**Nota:** `anio` y `mes` retornan 0 en este endpoint.

---

### `GET /api/Video/total-por-intermediaria`

Retorna el total de videoendoscopías agrupado por intermediaria para el rango de fechas indicado.

**Requiere autenticación JWT** — incluir header: `Authorization: Bearer {token}`

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Formato | Ejemplo |
|-----------|------|-----------|---------|---------|
| `fechaDesde` | string (date-time) | Sí | YYYY-MM-DD | 2024-01-01 |
| `fechaHasta` | string (date-time) | Sí | YYYY-MM-DD | 2024-12-31 |

#### Respuesta Exitosa (200 OK)

```json
[
  {
    "servicio": null,
    "intermediaria": "Imsa",
    "obraSocial": null,
    "anio": 0,
    "mes": 0,
    "cantidad": 864
  }
]
```

**Nota:** `servicio` y `obraSocial` retornan null.

---

### `GET /api/Video/total-por-os`

Retorna el total de videoendoscopías discriminado por obra social para el rango de fechas indicado.

**Requiere autenticación JWT** — incluir header: `Authorization: Bearer {token}`

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Formato | Ejemplo |
|-----------|------|-----------|---------|---------|
| `fechaDesde` | string (date-time) | Sí | YYYY-MM-DD | 2024-01-01 |
| `fechaHasta` | string (date-time) | Sí | YYYY-MM-DD | 2024-12-31 |

#### Respuesta Exitosa (200 OK)

```json
[
  {
    "servicio": null,
    "intermediaria": null,
    "obraSocial": "JERARQUICOS",
    "anio": 0,
    "mes": 0,
    "cantidad": 601
  }
]
```

**Nota:** `servicio` e `intermediaria` retornan null.

---

## Módulo: Tomo (Tomografía)

### `GET /api/Tomo`

Retorna el total de tomografías agrupadas por servicio, año y mes para el rango de fechas indicado.

**Requiere autenticación JWT** — incluir header: `Authorization: Bearer {token}`

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Formato | Ejemplo |
|-----------|------|-----------|---------|---------|
| `fechaDesde` | string (date-time) | Sí | YYYY-MM-DD | 2024-01-01 |
| `fechaHasta` | string (date-time) | Sí | YYYY-MM-DD | 2024-12-31 |

#### Respuesta Exitosa (200 OK)

```json
[
  {
    "servicio": "TOMOGRAFIA COMPUTADA",
    "intermediaria": null,
    "obraSocial": null,
    "anio": 2024,
    "mes": 1,
    "cantidad": 142
  }
]
```

---

### `GET /api/Tomo/total-por-fecha`

Retorna el total acumulado de tomografías agrupado por servicio para el rango de fechas indicado.

**Requiere autenticación JWT** — incluir header: `Authorization: Bearer {token}`

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Formato | Ejemplo |
|-----------|------|-----------|---------|---------|
| `fechaDesde` | string (date-time) | Sí | YYYY-MM-DD | 2024-01-01 |
| `fechaHasta` | string (date-time) | Sí | YYYY-MM-DD | 2024-12-31 |

#### Respuesta Exitosa (200 OK)

```json
[
  {
    "servicio": "TOMOGRAFIA COMPUTADA",
    "intermediaria": null,
    "obraSocial": null,
    "anio": 0,
    "mes": 0,
    "cantidad": 2343
  }
]
```

---

### `GET /api/Tomo/total-por-intermediaria`

Retorna el total de tomografías agrupado por intermediaria para el rango de fechas indicado.

**Requiere autenticación JWT** — incluir header: `Authorization: Bearer {token}`

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Formato | Ejemplo |
|-----------|------|-----------|---------|---------|
| `fechaDesde` | string (date-time) | Sí | YYYY-MM-DD | 2024-01-01 |
| `fechaHasta` | string (date-time) | Sí | YYYY-MM-DD | 2024-12-31 |

#### Respuesta Exitosa (200 OK)

```json
[
  {
    "servicio": null,
    "intermediaria": "Imsa",
    "obraSocial": null,
    "anio": 0,
    "mes": 0,
    "cantidad": 864
  }
]
```

---

### `GET /api/Tomo/total-por-os`

Retorna el total de tomografías discriminado por obra social para el rango de fechas indicado.

**Requiere autenticación JWT** — incluir header: `Authorization: Bearer {token}`

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Formato | Ejemplo |
|-----------|------|-----------|---------|---------|
| `fechaDesde` | string (date-time) | Sí | YYYY-MM-DD | 2024-01-01 |
| `fechaHasta` | string (date-time) | Sí | YYYY-MM-DD | 2024-12-31 |

#### Respuesta Exitosa (200 OK)

```json
[
  {
    "servicio": null,
    "intermediaria": null,
    "obraSocial": "JERARQUICOS",
    "anio": 0,
    "mes": 0,
    "cantidad": 601
  }
]
```

---

## Módulo: Resonancia (Resonancia Magnética)

### `GET /api/Resonancia`

Retorna el total de resonancias magnéticas agrupadas por servicio, año y mes para el rango de fechas indicado.

**Requiere autenticación JWT** — incluir header: `Authorization: Bearer {token}`

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Formato | Ejemplo |
|-----------|------|-----------|---------|---------|
| `fechaDesde` | string (date-time) | Sí | YYYY-MM-DD | 2024-01-01 |
| `fechaHasta` | string (date-time) | Sí | YYYY-MM-DD | 2024-12-31 |

#### Respuesta Exitosa (200 OK)

```json
[
  {
    "servicio": "RESONANCIA MAGNETICA",
    "intermediaria": null,
    "obraSocial": null,
    "anio": 2024,
    "mes": 1,
    "cantidad": 142
  }
]
```

---

### `GET /api/Resonancia/total-por-fecha`

Retorna el total acumulado de resonancias magnéticas agrupado por servicio para el rango de fechas indicado.

**Requiere autenticación JWT** — incluir header: `Authorization: Bearer {token}`

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Formato | Ejemplo |
|-----------|------|-----------|---------|---------|
| `fechaDesde` | string (date-time) | Sí | YYYY-MM-DD | 2024-01-01 |
| `fechaHasta` | string (date-time) | Sí | YYYY-MM-DD | 2024-12-31 |

#### Respuesta Exitosa (200 OK)

```json
[
  {
    "servicio": "RESONANCIA MAGNETICA",
    "intermediaria": null,
    "obraSocial": null,
    "anio": 0,
    "mes": 0,
    "cantidad": 2343
  }
]
```

---

### `GET /api/Resonancia/total-por-intermediaria`

Retorna el total de resonancias magnéticas agrupado por intermediaria para el rango de fechas indicado.

**Requiere autenticación JWT** — incluir header: `Authorization: Bearer {token}`

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Formato | Ejemplo |
|-----------|------|-----------|---------|---------|
| `fechaDesde` | string (date-time) | Sí | YYYY-MM-DD | 2024-01-01 |
| `fechaHasta` | string (date-time) | Sí | YYYY-MM-DD | 2024-12-31 |

#### Respuesta Exitosa (200 OK)

```json
[
  {
    "servicio": null,
    "intermediaria": "Imsa",
    "obraSocial": null,
    "anio": 0,
    "mes": 0,
    "cantidad": 864
  }
]
```

---

### `GET /api/Resonancia/total-por-os`

Retorna el total de resonancias magnéticas discriminado por obra social para el rango de fechas indicado.

**Requiere autenticación JWT** — incluir header: `Authorization: Bearer {token}`

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Formato | Ejemplo |
|-----------|------|-----------|---------|---------|
| `fechaDesde` | string (date-time) | Sí | YYYY-MM-DD | 2024-01-01 |
| `fechaHasta` | string (date-time) | Sí | YYYY-MM-DD | 2024-12-31 |

#### Respuesta Exitosa (200 OK)

```json
[
  {
    "servicio": null,
    "intermediaria": null,
    "obraSocial": "JERARQUICOS",
    "anio": 0,
    "mes": 0,
    "cantidad": 601
  }
]
```

---

## Modelo de Respuesta

Todos los endpoints devuelven arrays JSON. Los campos no utilizados en una consulta retornan `null` o `0`.

### Campos Comunes

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `servicio` | string | Nombre del servicio médico (VIDEOENDOSCOPIA, TOMOGRAFIA COMPUTADA, RESONANCIA MAGNETICA) |
| `intermediaria` | string \| null | Nombre de la intermediaria |
| `obraSocial` | string \| null | Nombre de la obra social |
| `anio` | integer | Año del período (0 si no aplica) |
| `mes` | integer | Mes del período (0 si no aplica) |
| `cantidad` | integer | Total de estudios realizados |

---

## Códigos de Respuesta HTTP

| Código | Estado | Descripción |
|--------|--------|-------------|
| `200` | OK | Solicitud exitosa. Retorna array de datos. |
| `400` | Bad Request | Parámetros inválidos o faltantes. |
| `401` | Unauthorized | Token JWT ausente, inválido o expirado. |
| `404` | Not Found | Endpoint no encontrado. Verificar URL. |
| `500` | Internal Server Error | Error interno o fallo en la base de datos. |

---

## Resumen de Endpoints

| Servicio | Método | Endpoint | Descripción |
|----------|--------|----------|-------------|
| **Video** | GET | `/api/Video` | Videoendoscopías por período |
| | GET | `/api/Video/total-por-fecha` | Total de videoendoscopías |
| | GET | `/api/Video/total-por-intermediaria` | Videoendoscopías por intermediaria |
| | GET | `/api/Video/total-por-os` | Videoendoscopías por obra social |
| **Tomo** | GET | `/api/Tomo` | Tomografías por período |
| | GET | `/api/Tomo/total-por-fecha` | Total de tomografías |
| | GET | `/api/Tomo/total-por-intermediaria` | Tomografías por intermediaria |
| | GET | `/api/Tomo/total-por-os` | Tomografías por obra social |
| **Resonancia** | GET | `/api/Resonancia` | Resonancias por período |
| | GET | `/api/Resonancia/total-por-fecha` | Total de resonancias |
| | GET | `/api/Resonancia/total-por-intermediaria` | Resonancias por intermediaria |
| | GET | `/api/Resonancia/total-por-os` | Resonancias por obra social |
