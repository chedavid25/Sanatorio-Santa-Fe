"""
Backfill historico completo de Ecografia desde 2023-01-01.
Carga:
  1. Agregados (bronze_ecografia) - datos por periodo, OS, intermediaria, ubicacion
  2. Detalle (bronze_detalle_di)  - 8 combinaciones serv_id/ubic_id

Correr una sola vez. Es seguro repetirlo:
  - bronze_ecografia usa INSERT; la vista Silver deduplica por sync_timestamp DESC
  - bronze_detalle_di usa UPSERT por (me_id, serv_id, ubic_id)
"""

import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
from sync_data import get_api_token, fetch_data, fetch_detalle

load_dotenv()

SUPABASE_URL        = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client    = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

FECHA_DESDE = "2023-01-01"
FECHA_HASTA = datetime.now().strftime("%Y-%m-%d")

ECO_DETALLE = [
    (123, 3,  "ECOGRAFIAS - Sanatorio SF"),
    (201, 3,  "ECO MAMARIA - Sanatorio SF"),
    (211, 3,  "PUNCION BAJO ECO - Sanatorio SF"),
    (231, 8,  "ECO ESPERANZA"),
    (251, 11, "ECO SAN LUIS"),
    (262, 7,  "ECO SANTO TOME"),
    (359, 14, "ECO GRAL PAZ"),
    (367, 22, "ECO CEMI"),
]


def backfill_agregados(token):
    print("\n=== PASO 1: Agregados (bronze_ecografia) ===")
    endpoints = [
        "/api/Eco",
        "/api/Eco/total-por-fecha",
        "/api/Eco/total-por-intermediaria",
        "/api/Eco/total-por-os",
        "/api/Eco/total-por-ubicacion",
    ]

    sync_ts = datetime.now(timezone.utc).isoformat()
    total = 0

    for endpoint in endpoints:
        print(f"  GET {endpoint} ...")
        data = fetch_data(token, endpoint, FECHA_DESDE, FECHA_HASTA)
        if not data:
            print("    Sin datos.")
            continue

        rows = [
            {
                "servicio":       item.get("servicio"),
                "intermediaria":  item.get("intermediaria"),
                "obra_social":    item.get("obraSocial"),
                "anio":           item.get("anio"),
                "mes":            item.get("mes"),
                "cantidad":       item.get("cantidad"),
                "sync_timestamp": sync_ts,
            }
            for item in data
        ]

        supabase.schema("diagnostico_imagenes").table("bronze_ecografia").insert(rows).execute()
        total += len(rows)
        print(f"    {len(rows)} filas insertadas.")

    print(f"\n  Agregados: {total} filas totales insertadas en bronze_ecografia.")
    return total


def backfill_detalle(token):
    print("\n=== PASO 2: Detalle (bronze_detalle_di) ===")
    sync_ts = datetime.now(timezone.utc).isoformat()
    total   = 0

    for serv_id, ubic_id, nombre in ECO_DETALLE:
        print(f"\n  GET /api/Eco/detalle serv_id={serv_id} ubic_id={ubic_id} ({nombre}) ...")
        try:
            data = fetch_detalle(token, "Eco", serv_id, ubic_id, FECHA_DESDE, FECHA_HASTA)
        except Exception as e:
            print(f"    ERROR: {e}")
            continue

        if not data:
            print("    Sin datos.")
            continue

        rows = []
        for item in data:
            fecha_raw = item.get("me_Fecha") or item.get("me_fecha") or ""
            fecha_iso = fecha_raw[:10] if fecha_raw else None
            rows.append({
                "modulo":                "Eco",
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

        filas_serv = 0
        for i in range(0, len(rows), 200):
            batch = rows[i:i + 200]
            supabase.schema("diagnostico_imagenes") \
                .table("bronze_detalle_di") \
                .upsert(batch, on_conflict="me_id,serv_id,ubic_id") \
                .execute()
            filas_serv += len(batch)

        total += filas_serv
        print(f"    {filas_serv} filas upserted.")

    print(f"\n  Detalle: {total} filas totales upserted en bronze_detalle_di.")
    return total


def main():
    print(f"Backfill historico Ecografia")
    print(f"Rango: {FECHA_DESDE} -> {FECHA_HASTA}")

    print("\nAutenticando...")
    token = get_api_token()
    print("Token OK.")

    filas_agr = backfill_agregados(token)
    filas_det = backfill_detalle(token)

    # Refrescar las vistas materializadas
    from sync_data import refresh_materialized_views
    refresh_materialized_views()

    print("\n" + "=" * 45)
    print("RESUMEN FINAL")
    print("=" * 45)
    print(f"  bronze_ecografia (agregados):  {filas_agr} filas")
    print(f"  bronze_detalle_di (detalle):   {filas_det} filas")
    print("=" * 45)
    print("\nListo. Los datos aparecen en el dashboard de inmediato.")


if __name__ == "__main__":
    main()
