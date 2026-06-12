import os
import requests
from datetime import datetime, timezone, timedelta, date
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL")
API_IDENTITY_URL = os.getenv("API_IDENTITY_URL")
API_EMAIL = os.getenv("API_EMAIL")
API_PASSWORD = os.getenv("API_PASSWORD")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# (modulo, api_module, serv_id, ubic_id)
DETALLE_COMBINATIONS = [
    ("Video",      "Video",      128, 3),
    ("Tomo",       "Tomo",       124, 3),
    ("Resonancia", "Resonancia", 248, 3),
    ("Resonancia", "Resonancia", 125, 3),   # RESONANCIA - serv_id alternativo (confirmado por Daniel)
    ("Eco",        "Eco",        123, 3),   # ECOGRAFIAS - Sanatorio SF
    ("Eco",        "Eco",        201, 3),   # ECO MAMARIA - Sanatorio SF
    ("Eco",        "Eco",        211, 3),   # PUNCION BAJO ECO - Sanatorio SF
    ("Eco",        "Eco",        231, 8),   # ECO ESPERANZA
    ("Eco",        "Eco",        251, 11),  # ECO SAN LUIS
    ("Eco",        "Eco",        262, 7),   # ECO STO TOME
    ("Eco",        "Eco",        359, 14),  # ECO GRAL PAZ
    ("Eco",        "Eco",        367, 22),  # ECO CEMI
    ("Eco",        "Eco",        209, 3),   # ECODOPPLER CARDIACO - Sanatorio SF
    ("Eco",        "Eco",        281, 7),   # ECODOPPLER CARDIACO - STO TOME
    ("Eco",        "Eco",        360, 14),  # ECODOPPLER CARDIACO - GRAL PAZ
    ("Nuclear",    "Nuclear",    164, 3),   # MEDICINA NUCLEAR - Sanatorio SF
    ("Densi",      "Densi",      228, 3),   # DENSITOMETRIA OSEA - Sanatorio SF
    ("Odonto",     "Odonto",     386, 3),   # IMAGENES ODONTOLOGICAS - Sanatorio SF
    ("Radio",      "Radio",      127, 3),   # RADIOLOGIA DIGITAL - Sanatorio SF
    ("Radio",      "Radio",      222, 3),   # RADIOLOGIA DIGITAL URGENCIA - Sanatorio SF
    ("Radio",      "Radio",      256, 11),  # RADIOLOGIA SAN LUIS
    ("Radio",      "Radio",      230, 8),   # RX CLINICA ESPERANZA
    ("Radio",      "Radio",      355, 7),   # RX CLINICA SANTO TOME
    ("Angio",      "Angio",      135, 3),   # ANGIOGRAFIA - Sanatorio SF
]


def get_api_token():
    url = f"{API_IDENTITY_URL.rstrip('/')}/api/Auth/login"
    response = requests.post(
        url,
        json={"email": API_EMAIL, "password": API_PASSWORD},
        timeout=30,
    )
    response.raise_for_status()
    return response.json().get("token")


def fetch_data(token, endpoint, fecha_desde, fecha_hasta):
    url = f"{API_BASE_URL.rstrip('/')}{endpoint}"
    response = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        params={"fechaDesde": fecha_desde, "fechaHasta": fecha_hasta},
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    return data if isinstance(data, list) else []


def fetch_detalle(token, api_module, serv_id, ubic_id, fecha_desde, fecha_hasta):
    url = f"{API_BASE_URL.rstrip('/')}/api/Servicios/detalle"
    response = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        params={
            "fechaDesde": fecha_desde,
            "fechaHasta": fecha_hasta,
            "serv_id": serv_id,
        },
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()
    return data if isinstance(data, list) else []


def sync_service(token, service_name, table_name, fecha_desde, fecha_hasta, extra_endpoints=None):
    endpoints = [
        f"/api/{service_name}",
        f"/api/{service_name}/total-por-fecha",
        f"/api/{service_name}/total-por-intermediaria",
        f"/api/{service_name}/total-por-os",
    ]
    if extra_endpoints:
        endpoints.extend(extra_endpoints)

    total_inserted = 0
    sync_ts = datetime.now(timezone.utc).isoformat()

    for endpoint in endpoints:
        print(f"  GET {endpoint} ...")
        data = fetch_data(token, endpoint, fecha_desde, fecha_hasta)

        if not data:
            print(f"    Sin datos.")
            continue

        rows = [
            {
                "servicio": item.get("servicio"),
                "intermediaria": item.get("intermediaria"),
                "obra_social": item.get("obraSocial"),
                "anio": item.get("anio"),
                "mes": item.get("mes"),
                "cantidad": item.get("cantidad"),
                "sync_timestamp": sync_ts,
            }
            for item in data
        ]

        supabase.schema("diagnostico_imagenes").table(table_name).insert(rows).execute()
        total_inserted += len(rows)
        print(f"    {len(rows)} filas insertadas.")

    return total_inserted


def sync_detalle(token, fecha_desde, fecha_hasta):
    total_upserted = 0
    sync_ts = datetime.now(timezone.utc).isoformat()

    for modulo, api_module, serv_id, ubic_id in DETALLE_COMBINATIONS:
        print(f"  GET /api/{api_module}/detalle (serv_id={serv_id}, ubic_id={ubic_id}) ...")
        try:
            data = fetch_detalle(token, api_module, serv_id, ubic_id, fecha_desde, fecha_hasta)
        except Exception as e:
            print(f"    ERROR: {e}")
            continue

        if not data:
            print(f"    Sin datos.")
            continue

        rows = []
        for item in data:
            fecha_raw = item.get("me_Fecha") or item.get("me_fecha") or ""
            fecha_iso = fecha_raw[:10] if fecha_raw else None
            rows.append({
                "modulo":                modulo,
                "serv_id":               serv_id,
                "ubic_id":               ubic_id,
                "me_id":                 item.get("me_id"),
                "me_fecha":              fecha_iso,
                "me_edad":               item.get("me_Edad") or item.get("me_edad"),
                "area":                  item.get("area"),
                "hora_atencion":         item.get("horaAtencion"),
                "sexo_paciente":         item.get("sexoPaciente"),
                "localidad_paciente":    item.get("localidadPaciente"),
                "siglas_os":             item.get("siglasObraSocial"),
                "nombre_os":             item.get("nombreObraSocial"),
                "intermediaria":         item.get("intermediaria"),
                "matricula_solicitante": item.get("matriculaSolicitante"),
                "nombre_solicitante":    item.get("nombreSolicitante"),
                "codigo_practica":       item.get("codigoPractica"),
                "nombre_practica":       item.get("nombrePractica"),
                "cantidad_practica":     item.get("cantidadPractica"),
                "servicio":              item.get("servicio"),
                "consultorio":           item.get("consultorio"),
                "mp_efector":            item.get("mpEfector"),
                "nombre_efector":        item.get("nombreEfector"),
                "sync_timestamp":        sync_ts,
            })

        # UPSERT en lotes de 200 — la clave es (me_id, serv_id, ubic_id)
        for i in range(0, len(rows), 200):
            batch = rows[i:i + 200]
            supabase.schema("diagnostico_imagenes") \
                .table("bronze_detalle_di") \
                .upsert(batch, on_conflict="me_id,serv_id,ubic_id") \
                .execute()

        total_upserted += len(rows)
        print(f"    {len(rows)} filas upserted.")

    return total_upserted


def log_sync(departamento, servicio, filas_insertadas, estado, fecha_desde, fecha_hasta, mensaje_error=None):
    entry = {
        "departamento": departamento,
        "servicio": servicio,
        "filas_insertadas": filas_insertadas,
        "estado": estado,
        "fecha_desde": fecha_desde,
        "fecha_hasta": fecha_hasta,
        "mensaje_error": mensaje_error,
    }
    try:
        supabase.schema("logs").table("log_sincronizacion").insert(entry).execute()
    except Exception as e:
        print(f"  [WARN] No se pudo registrar log en Supabase: {e}")


def get_fecha_desde():
    """Devuelve la fecha de inicio para este sync.
    Si hay syncs previos exitosos, usa la fecha del ultimo (- 1 dia de margen).
    Si es la primera vez, usa 2023-01-01.
    """
    try:
        result = supabase.schema("logs").table("log_sincronizacion") \
            .select("ejecutado_en") \
            .eq("estado", "OK") \
            .order("ejecutado_en", desc=True) \
            .limit(1) \
            .execute()
        if result.data:
            ultimo = result.data[0]["ejecutado_en"][:10]
            desde = (date.fromisoformat(ultimo) - timedelta(days=1)).isoformat()
            print(f"Ultimo sync exitoso: {ultimo} -> fecha_desde = {desde}")
            return desde
    except Exception as e:
        print(f"[WARN] No se pudo leer ultimo sync: {e}")
    return "2023-01-01"


def main():
    fecha_desde = get_fecha_desde()
    fecha_hasta = datetime.now().strftime("%Y-%m-%d")

    services = [
        ("Video",      "bronze_videoendoscopia", None),
        ("Tomo",       "bronze_tomografia",      None),
        ("Resonancia", "bronze_resonancia",       None),
        ("Eco",        "bronze_ecografia",        ["/api/Eco/total-por-ubicacion"]),
    ]

    print(f"Sincronizacion: {fecha_desde} -> {fecha_hasta}\n")

    print("Autenticando en la API del Sanatorio...")
    token = get_api_token()
    print("Token obtenido.\n")

    resumen = {}

    # ── Sync agregados ─────────────────────────────────────────
    for service_name, table_name, extra_ep in services:
        print(f"--- {service_name} -> diagnostico_imagenes.{table_name} ---")
        try:
            filas = sync_service(token, service_name, table_name, fecha_desde, fecha_hasta, extra_ep)
            log_sync("Diagnostico por Imagenes", service_name, filas, "OK", fecha_desde, fecha_hasta)
            resumen[service_name] = filas
            print(f"  TOTAL: {filas} filas\n")
        except Exception as e:
            log_sync("Diagnostico por Imagenes", service_name, 0, "ERROR", fecha_desde, fecha_hasta, str(e))
            resumen[service_name] = f"ERROR: {e}"
            print(f"  ERROR: {e}\n")

    # ── Sync detalle ───────────────────────────────────────────
    print(f"--- Detalle -> diagnostico_imagenes.bronze_detalle_di ---")
    try:
        filas_det = sync_detalle(token, fecha_desde, fecha_hasta)
        log_sync("Diagnostico por Imagenes", "Detalle", filas_det, "OK", fecha_desde, fecha_hasta)
        resumen["Detalle"] = filas_det
        print(f"  TOTAL: {filas_det} filas\n")
    except Exception as e:
        log_sync("Diagnostico por Imagenes", "Detalle", 0, "ERROR", fecha_desde, fecha_hasta, str(e))
        resumen["Detalle"] = f"ERROR: {e}"
        print(f"  ERROR: {e}\n")

    # ── Refresco de Vistas Materializadas ──────────────────────
    refresh_materialized_views()

    print("=" * 45)
    print("RESUMEN FINAL")
    print("=" * 45)
    for svc, resultado in resumen.items():
        tabla = next((t for s, t, _ in services if s == svc), "bronze_detalle_di")
        print(f"  {svc:12} -> {tabla:30} : {resultado}")
    print("=" * 45)


def refresh_materialized_views():
    import psycopg2
    print("\n--- Refrescando vistas materializadas ---")
    DB_HOST = "aws-1-sa-east-1.pooler.supabase.com"
    DB_NAME = "postgres"
    DB_USER = "postgres.akheyrrqstgsrfnpzxbx"
    DB_PASS = "Romateamamos1!"
    DB_PORT = "5432"
    
    views = [
        "gold.gold_vw_di_multidimensional_saneado",
        "gold.gold_vw_di_os_por_intermediaria",
        "gold.gold_vw_di_sede_por_practica",
        "gold.gold_vw_di_sede_por_derivante",
        "gold.gold_vw_di_sede_por_os",
        "gold.gold_vw_di_sede_por_intermediaria",
        "gold.gold_vw_di_derivantes_por_servicio",
        "gold.gold_vw_di_servicio_por_derivante"
    ]
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            port=DB_PORT
        )
        conn.autocommit = True
        with conn.cursor() as cur:
            for view in views:
                print(f"  Refrescando {view}...")
                cur.execute(f"REFRESH MATERIALIZED VIEW {view};")
        conn.close()
        print("Vistas materializadas actualizadas con éxito.")
    except Exception as e:
        print(f"  [ERROR] Al refrescar vistas materializadas: {e}")


if __name__ == "__main__":
    main()
