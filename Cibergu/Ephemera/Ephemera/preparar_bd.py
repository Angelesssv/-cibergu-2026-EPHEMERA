from database import engine
from sqlalchemy import text
import uuid
from datetime import datetime, timedelta

def reset_and_seed_db():
    print("Iniciando purga de la base de datos...")
    
    with engine.begin() as conn:
        # 1. LIMPIAR TODA LA BASURA ANTERIOR
        conn.execute(text("DELETE FROM elements"))
        conn.execute(text("DELETE FROM incidents"))
        conn.execute(text("DELETE FROM evidences"))
        conn.execute(text("DELETE FROM activity_log"))
        
        print("Base de datos limpia. Inyectando datos de la demo...")
        
        now = datetime.now()
        case_id = "case-1"

        # 2. INYECTAR LOS 7 ELEMENTOS (Huella Digital)
        elements = [
            (str(uuid.uuid4()), case_id, "alias", "_matei.bl_: @migueeltriju_08 me cae fatal 👎👎", "visible"),
            (str(uuid.uuid4()), case_id, "link", "mtrijueque.tech / dataDB.json", "visible"),
            (str(uuid.uuid4()), case_id, "image", "Captura de entorno de desarrollo (VS Code)", "visible"),
            (str(uuid.uuid4()), case_id, "other", "Comentario: Crazy", "visible"),
            (str(uuid.uuid4()), case_id, "other", "Comentario: World because is not 15", "visible"),
            (str(uuid.uuid4()), case_id, "other", "Interés: Programación e IA", "visible"),
            (str(uuid.uuid4()), case_id, "other", "Petición de contenido informática", "visible")
        ]
        
        for el in elements:
            conn.execute(text("""
                INSERT INTO elements (id, case_id, type, value, visibility_status) 
                VALUES (:id, :case, :type, :val, :status)
            """), {"id": el[0], "case": el[1], "type": el[2], "val": el[3], "status": el[4]})

        # 3. INYECTAR INCIDENCIAS (CON CASE_ID)
        incidents = [
            (str(uuid.uuid4()), case_id, "acoso", "Instagram", (now - timedelta(minutes=20)).isoformat()),
            (str(uuid.uuid4()), case_id, "reaparicion", "GitHub", (now - timedelta(hours=2)).isoformat())
        ]
        for inc in incidents:
            conn.execute(text("""
                INSERT INTO incidents (id, case_id, type, source, detected_at) 
                VALUES (:id, :case, :type, :source, :date)
            """), {"id": inc[0], "case": inc[1], "type": inc[2], "source": inc[3], "date": inc[4]})

        # 4. INYECTAR EVIDENCIAS
        evidences = [
            (str(uuid.uuid4()), case_id, "Mención Negativa", "visible", "Instagram", now.isoformat(), "WhatsApp Image 2026-04-08 at 21.11.18.jpeg"),
            (str(uuid.uuid4()), case_id, "Código Expuesto", "visible", "GitHub", (now - timedelta(days=1)).isoformat(), "WhatsApp Image 2026-04-08 at 21.11.17 (1).jpeg"),
            (str(uuid.uuid4()), case_id, "Publicación", "visible", "Instagram", (now - timedelta(days=2)).isoformat(), "WhatsApp Image 2026-04-08 at 21.11.17.jpeg")
        ]
        for ev in evidences:
            conn.execute(text("""
                INSERT INTO evidences (id, case_id, type, status, source, date, hash) 
                VALUES (:id, :case, :type, :status, :source, :date, :hash)
            """), {"id": ev[0], "case": ev[1], "type": ev[2], "status": ev[3], "source": ev[4], "date": ev[5], "hash": ev[6]})

    print("¡Éxito! La base de datos está lista para la presentación.")

if __name__ == "__main__":
    reset_and_seed_db()