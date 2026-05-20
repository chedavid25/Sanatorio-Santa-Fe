import os
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
EXCEL_PATH = "Estructura y Códigos por servicio (1).xlsx"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

SHEET_TO_SERVICIO = {
    "VIDEO": "VIDEOENDOSCOPIA",
    "RESO":  "RESONANCIA IMAGENES",
    "TAC":   "TOMOGRAFIA COMPUTADA",
    "ECO":   "ECOGRAFIA",
}


def load_codigos_nomenclador():
    all_rows = []
    for sheet, servicio in SHEET_TO_SERVICIO.items():
        df = pd.read_excel(EXCEL_PATH, sheet_name=sheet, header=1)
        df = df.dropna(subset=["Codigos"])

        # Columna 5 (índice) = "Unificación de Nombre" (nombre con encoding variable)
        nombre_unificado_col = df.columns[5]

        for _, row in df.iterrows():
            excluir = bool(row.get("No es estudio", False)) or bool(row.get("Mal cargado", False))
            nombre_unificado = row.get(nombre_unificado_col)
            all_rows.append({
                "codigo":           int(row["Codigos"]),
                "nombre_original":  str(row["Nombre"]).strip(),
                "servicio":         servicio,
                "es_estudio":       bool(row.get("Estudio", False)),
                "excluir":          excluir,
                "nombre_unificado": str(nombre_unificado).strip() if pd.notna(nombre_unificado) else None,
            })

    print(f"  Cargando {len(all_rows)} codigos en silver_codigos_nomenclador...")
    # Insertar en lotes de 200
    for i in range(0, len(all_rows), 200):
        batch = all_rows[i:i + 200]
        supabase.schema("silver_shared").table("silver_codigos_nomenclador").insert(batch).execute()
        print(f"    Lote {i // 200 + 1}: {len(batch)} filas insertadas")

    return len(all_rows)


def load_sedes_equivalencias():
    df = pd.read_excel(EXCEL_PATH, sheet_name="ECO", header=1)
    sedes_df = df[["Servicios ", "Unificar", "Sede"]].dropna(subset=["Servicios "])

    rows = []
    for _, row in sedes_df.iterrows():
        servicio_crudo = str(row["Servicios "]).strip()
        servicio_limpio = str(row["Unificar"]).strip()
        sede_raw = str(row["Sede"]).strip()

        # Si la sede tiene "/" es que aplica a dos sedes: crear una fila por cada una
        if "/" in sede_raw:
            for sede in sede_raw.split("/"):
                sede = sede.strip()
                if sede:
                    rows.append({
                        "servicio_crudo":  servicio_crudo,
                        "servicio_limpio": servicio_limpio,
                        "sede":            sede,
                    })
        else:
            rows.append({
                "servicio_crudo":  servicio_crudo,
                "servicio_limpio": servicio_limpio,
                "sede":            sede_raw,
            })

    # servicio_crudo tiene UNIQUE constraint: deduplicar (tomar primera sede si hay duplicados)
    seen = {}
    deduped = []
    for r in rows:
        if r["servicio_crudo"] not in seen:
            seen[r["servicio_crudo"]] = True
            deduped.append(r)

    print(f"  Cargando {len(deduped)} sedes en silver_sedes_equivalencias...")
    supabase.schema("silver_shared").table("silver_sedes_equivalencias").insert(deduped).execute()
    return len(deduped)


def main():
    print("=== Carga de silver_shared ===\n")

    print("1. silver_codigos_nomenclador")
    n1 = load_codigos_nomenclador()
    print(f"   OK: {n1} filas\n")

    print("2. silver_sedes_equivalencias")
    n2 = load_sedes_equivalencias()
    print(f"   OK: {n2} filas\n")

    print("3. silver_os_equivalencias y silver_intermediaria_equivalencias")
    print("   (sin datos en el Excel — se cargan manualmente luego)\n")

    print("=" * 45)
    print("RESUMEN")
    print("=" * 45)
    print(f"  silver_codigos_nomenclador : {n1} filas")
    print(f"  silver_sedes_equivalencias : {n2} filas")
    print("=" * 45)


if __name__ == "__main__":
    main()
