from database import engine
from sqlalchemy import text
import uuid
from datetime import datetime, timedelta

def reset_and_seed_db():
    print("Iniciando purga de la base de datos...")
    
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM elements"))
        conn.execute(text("DELETE FROM incidents"))
        conn.execute(text("DELETE FROM evidences"))
        conn.execute(text("DELETE FROM activity_log"))
        
        now = datetime.now()
        case_id = "case-1"

        # 2. INYECTAR LOS 7 ELEMENTOS
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
            conn.execute(text("INSERT INTO elements (id, case_id, type, value, visibility_status) VALUES (:id, :case, :type, :val, :status)"), {"id": el[0], "case": el[1], "type": el[2], "val": el[3], "status": el[4]})

        # 3. INYECTAR INCIDENCIAS
        incidents = [
            (str(uuid.uuid4()), case_id, "acoso", "Instagram", (now - timedelta(minutes=20)).isoformat()),
            (str(uuid.uuid4()), case_id, "reaparicion", "GitHub", (now - timedelta(hours=2)).isoformat())
        ]
        for inc in incidents:
            conn.execute(text("INSERT INTO incidents (id, case_id, type, source, detected_at) VALUES (:id, :case, :type, :source, :date)"), {"id": inc[0], "case": inc[1], "type": inc[2], "source": inc[3], "date": inc[4]})

        # 4. INYECTAR EVIDENCIAS (AQUÍ ESTÁN LOS NOMBRES CORREGIDOS)
        evidences = [
            (str(uuid.uuid4()), case_id, "Mención Negativa", "visible", "Instagram", now.isoformat(), "mecaefatal.jpg"),
            (str(uuid.uuid4()), case_id, "Código Expuesto", "visible", "GitHub", (now - timedelta(days=1)).isoformat(), "mtrijueque.tech.jpg"),
            (str(uuid.uuid4()), case_id, "Publicación", "visible", "Instagram", (now - timedelta(days=2)).isoformat(), "vscode.jpg")
        ]
        for ev in evidences:
            conn.execute(text("INSERT INTO evidences (id, case_id, type, status, source, date, hash) VALUES (:id, :case, :type, :status, :source, :date, :hash)"), {"id": ev[0], "case": ev[1], "type": ev[2], "status": ev[3], "source": ev[4], "date": ev[5], "hash": ev[6]})

    print("¡Éxito! Base de datos lista con las rutas de imagen correctas.")

if __name__ == "__main__":
    reset_and_seed_db()