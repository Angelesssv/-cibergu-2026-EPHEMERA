from fastapi import FastAPI, HTTPException
from database import engine
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime
import uuid
import hashlib

class Element(BaseModel):
    case_id: str
    type: str
    value: str

class EvidenceResponse(BaseModel):
    id: str
    type: str
    status: str
    source: str
    date: datetime
    hash: str

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/elements")
def create_element(el: Element):
    # --- PROTECCIÓN DE DATOS (MVP) ---
    if el.type in ['alias', 'username', 'name']:
        hashed_value = hashlib.sha256(el.value.encode('utf-8')).hexdigest()
        print(f"[DATA_PROTECTED] - {datetime.now()} - {el.type.upper()} procesado internamente como: {hashed_value}")

    element_id = str(uuid.uuid4())
    
    # Bloque blindado para escritura
    with engine.begin() as conn: 
        conn.execute(text("""
            INSERT INTO elements (id, case_id, type, value, visibility_status)
            VALUES (:id, :case_id, :type, :value, 'visible')
        """), {
            "id": element_id,
            "case_id": el.case_id,
            "type": el.type,
            "value": el.value
        })

    return {"id": element_id, "status": "success", "message": "Elemento añadido correctamente"}

@app.get("/elements/{case_id}")
def get_elements(case_id: str):
    # Bloque blindado para lectura
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM elements"))
        elements = [dict(row._mapping) for row in result]
    return elements

@app.put("/elements/{element_id}/visibility")
def change_visibility(element_id: str, new_status: str, user_id: str):
    with engine.begin() as conn: # engine.begin() abre, hace commit automático y cierra
        result = conn.execute(text("SELECT visibility_status FROM elements WHERE id = :id"), {"id": element_id})
        element = result.fetchone()

        if not element:
            return {"error": "Elemento no encontrado"}

        old_status = element[0]

        conn.execute(text("""
            UPDATE elements SET visibility_status = :new_status WHERE id = :id
        """), {"new_status": new_status, "id": element_id})

        conn.execute(text("""
            INSERT INTO activity_log (id, user_id, element_id, action, old_value, new_value)
            VALUES (:id, :user_id, :element_id, 'change_visibility', :old, :new)
        """), {
            "id": str(uuid.uuid4()), "user_id": user_id, "element_id": element_id,
            "old": old_status, "new": new_status
        })
    return {"message": "Visibilidad actualizada"}

@app.get("/activity/{element_id}")
def get_activity(element_id: str):
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM activity_log WHERE element_id = :id"), {"id": element_id})
        logs = [dict(row._mapping) for row in result]
    return logs

@app.get("/incidents")
def get_all_incidents():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM incidents ORDER BY detected_at DESC"))
        incidents = [dict(row._mapping) for row in result]
    return incidents

@app.get("/activity")
def get_all_activity():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM activity_log ORDER BY timestamp DESC"))
        logs = [dict(row._mapping) for row in result]
    return logs

@app.get("/evidences/{case_id}", response_model=List[EvidenceResponse])
def get_evidences(case_id: str):
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, type, status, source, date, hash 
            FROM evidences WHERE case_id = :case_id ORDER BY date DESC
        """), {"case_id": case_id})
        evidencias_db = [dict(row._mapping) for row in result]
    return evidencias_db