import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = "aws-1-sa-east-1.pooler.supabase.com"
DB_NAME = "postgres"
DB_USER = "postgres.akheyrrqstgsrfnpzxbx"
DB_PASS = "Romateamamos1!"
DB_PORT = "5432"

try:
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        port=DB_PORT
    )
    cur = conn.cursor()
    
    views = [
        "gold.gold_vw_di_practicas_agg",
        "gold.gold_vw_di_derivantes_agg",
        "gold.gold_vw_di_os_por_mes",
        "gold.gold_vw_di_intermediaria_por_mes",
        "gold.gold_vw_di_resumen_por_sede_mes"
    ]
    for view in views:
        cur.execute(f"SELECT COUNT(*) FROM {view};")
        count = cur.fetchone()[0]
        print(f"Vista: {view} -> Cantidad de filas: {count}")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
