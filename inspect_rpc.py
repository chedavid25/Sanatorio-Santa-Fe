import psycopg2

def inspect():
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
        with conn.cursor() as cur:
            # Consultar el código fuente de la función refresh_multidimensional_view
            cur.execute("""
                SELECT prosrc 
                FROM pg_proc 
                WHERE proname = 'refresh_multidimensional_view';
            """)
            row = cur.fetchone()
            if row:
                print("CÓDIGO DE refresh_multidimensional_view:")
                print(row[0])
            else:
                print("No se encontró la función refresh_multidimensional_view")
        conn.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    inspect()
