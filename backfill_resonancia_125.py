"""
Backfill histórico para Resonancia serv_id=125, ubic_id=3.
Trae detalle desde 2023-01-01 hasta hoy y hace upsert en bronze_detalle_di.
Correr una sola vez para recuperar estudios que no se sincronizaron antes.
"""

import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
from sync_data import get_api_token, fetch_detalle

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

FECHA_DESDE = "2023-01-01"
FECHA_HASTA = datetime.now().strftime("%Y-%m-%d")
MODULO     = "Resonancia"
API_MODULE = "Resonancia"
SERV_ID    = 125
UBIC_ID    = 3

def main():
    print(f"Backfill {MODULO} serv_id={SERV_ID} ubic_id={UBIC_ID}")
    print(f"Rango: {FECHA_DESDE} -> {FECHA_HASTA}\n")

    print("Autenticando...")
    token = get_api_token()
    print("Token OK.\n")

    print(f"GET /api/{API_MODULE}/detalle ...")
    data = fetch_detalle(token, API_MODULE, SERV_ID, UBIC_ID, FECHA_DESDE, FECHA_HASTA)

    if not data:
        print("Sin datos - el endpoint no devolvió registros para ese rango.")
        return

    print(f"{len(data)} registros recibidos. Haciendo upsert...\n")

    sync_ts = datetime.now(timezone.utc).isoformat()
    rows = []
    for item in data:
        fecha_raw = item.get("me_Fecha") or item.get("me_fecha") or ""
        fecha_iso = fecha_raw[:10] if fecha_raw else None
        rows.append({
            "modulo":                MODULO,
            "serv_id":               SERV_ID,
            "ubic_id":               UBIC_ID,
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

    total = 0
    for i in range(0, len(rows), 200):
        batch = rows[i:i + 200]
        supabase.schema("diagnostico_imagenes") \
            .table("bronze_detalle_di") \
            .upsert(batch, on_conflict="me_id,serv_id,ubic_id") \
            .execute()
        total += len(batch)
        print(f"  Lote {i//200 + 1}: {len(batch)} filas upserted (total: {total})")

    print(f"\nListo. {total} filas procesadas para serv_id={SERV_ID}.")
    from sync_data import refresh_materialized_views
    refresh_materialized_views()

if __name__ == "__main__":
    main()
