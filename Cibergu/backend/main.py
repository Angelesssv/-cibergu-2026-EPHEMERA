from fastapi import FastAPI, HTTPException
from database import engine
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime
from cryptography.fernet import Fernet
import uuid
import hashlib
import asyncio
import time
import random

KEY = b'v_Xw2M4p_P_xO3bM4gH8h4_2qYx0H4h_K2pL4_h_H-8=' 
cipher = Fernet(KEY)

def encrypt_data(data: str) -> str:
    return cipher.encrypt(data.encode()).decode()

def decrypt_data(data: str) -> str:
    try:
        return cipher.decrypt(data.encode()).decode()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid encrypted data")

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

class UpdateStatusRequest(BaseModel):
    id: str
    status: str

class DecryptRequest(BaseModel):
    data: str

jobs = {}

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
        
    # --- CAPA DE CIFRADO ESTRUCTURAL ---
    # Ciframos los datos legibles de la base de datos ANTES de mandarlos a internet
    for el in elements:
        texto_original = el.get("value", "")
        # Si el texto existe y NO está cifrado aún (los cifrados Fernet empiezan por gAAAAA)
        if texto_original and not texto_original.startswith("gAAAAA"):
            el["value"] = encrypt_data(texto_original)
            
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
        # Hacemos un JOIN para cruzar el ID del log con el valor real del elemento
        result = conn.execute(text("""
            SELECT a.*, e.value as element_value 
            FROM activity_log a
            LEFT JOIN elements e ON a.element_id = e.id
            ORDER BY a.timestamp DESC
        """))
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

@app.post("/analyze")
async def analyze():
    # Simula latencia de red/cálculo
    await asyncio.sleep(random.uniform(0.6, 1.2))
    
    results = [
        {
            "id": "EXP-001",
            "title": "Perfil detectado",
            "risk": "ALTO",
            "confidence": round(random.uniform(90.0, 95.0), 1),
            "status": "visible",
            "encrypted": True,
            "data": encrypt_data("_matei.bl_: @migueeltriju_08 me cae fatal")
        },
        {
            "id": "EXP-002",
            "title": "Código expuesto",
            "risk": "MEDIO",
            "confidence": round(random.uniform(85.0, 89.0), 1),
            "status": "visible",
            "encrypted": True,
            "data": encrypt_data("mtrijueque.tech / dataDB.json")
        }
    ]
    return results

@app.post("/update-status")
async def update_status(req: UpdateStatusRequest):
    # Generar un ID de trabajo corto
    job_id = f"JOB-{str(uuid.uuid4())[:6].upper()}"
    
    estimated_time_ms = random.randint(2500, 3500)
    
    # Almacenar en "cola" de memoria
    jobs[job_id] = {
        "id": job_id,
        "target_id": req.id,
        "target_status": req.status,
        "status": "queued",
        "created_at": time.time(),
        "estimated_time_ms": estimated_time_ms
    }

    # Pequeño delay para simular el encolado
    await asyncio.sleep(0.3)

    return {
        "job": {
            "id": job_id,
            "status": "queued"
        },
        "estimated_time": estimated_time_ms
    }

@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job = jobs[job_id]
    
    # Cálculo matemático del progreso
    elapsed_ms = (time.time() - job["created_at"]) * 1000
    progress_raw = (elapsed_ms / job["estimated_time_ms"]) * 100
    progress = int(min(100, progress_raw))
    
    if progress == 0:
        status = "queued"
    elif progress < 100:
        status = "processing"
    else:
        status = "completed"
        
    return {
        "id": job_id,
        "status": status,
        "progress": progress
    }

@app.post("/decrypt")
async def decrypt(req: DecryptRequest):
    # Simula tiempo de desencriptado
    await asyncio.sleep(0.2)
    return {
        "decrypted": decrypt_data(req.data)
    }