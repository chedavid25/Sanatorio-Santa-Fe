import psycopg2
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración de conexión (usando pooler para mejor compatibilidad DNS)
DB_HOST = "aws-1-sa-east-1.pooler.supabase.com"
DB_NAME = "postgres"
DB_USER = "postgres.akheyrrqstgsrfnpzxbx"
DB_PASS = "Romateamamos1!"
DB_PORT = "5432"

SQL_FILES = [
    "bronze_setup.sql",
    "silver_shared_setup.sql",
    "silver_views.sql",
    "gold_views.sql"
]

def execute_sql_file(cur, file_path):
    print(f"  -> Ejecutando: {file_path}")
    if not os.path.exists(file_path):
        print(f"     [ERROR] Archivo no encontrado: {file_path}")
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            sql = f.read()
        cur.execute(sql)
        print(f"     [OK]")
        return True
    except Exception as e:
        print(f"     [ERROR] en {file_path}: {e}")
        return False

def main():
    print("=== ORQUESTADOR DE BASE DE DATOS - SANATORIO SANTA FE ===\n")
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            port=DB_PORT
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        print(f"Conectado a Supabase: {DB_HOST}\n")
        
        for sql_file in SQL_FILES:
            success = execute_sql_file(cur, sql_file)
            if not success:
                print("\n[CRÍTICO] Abortando ejecución debido a errores.")
                break
        else:
            print("\n✅ Configuración de base de datos completada con éxito.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error de conexión: {e}")

if __name__ == "__main__":
    main()
