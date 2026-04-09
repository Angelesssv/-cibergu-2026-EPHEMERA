# EPHEMERA

## Descripción

Prototipo funcional de un sistema de gestión de visibilidad digital.
Implementa simulación de análisis, detección de evidencias y cambio de estados sobre contenido expuesto.

El comportamiento del sistema se simula principalmente en frontend.

---

## Estructura

```
/backend
  main.py
  database.py

/database
  database.db

/Ephemera
  /css
  /js
  *.html
```

---

## Backend

Backend ligero en Python con FastAPI y SQLite.

Responsabilidades:

* Exponer endpoints básicos
* Acceso a datos (database.py)
* Servir información de evidencias

No hay lógica compleja ni procesamiento asíncrono real.

---

## Base de datos

SQLite (`database.db`)

Contiene:

* evidencias
* estados asociados

Uso local, sin concurrencia ni optimización.

---

## Frontend

HTML + CSS + JavaScript sin framework.

Responsabilidades:

* Render de vistas
* Simulación de análisis
* Gestión de estados en cliente
* Ejecución de flujos (loading, cambios de estado)

---

## JS

* `api.js` → comunicación con backend
* `app.js` → lógica principal y simulación
* `router.js` → navegación entre vistas
* `settings.js` → configuración global

---

## Flujo

1. Carga de demo
2. Simulación de análisis (frontend)
3. Render de evidencias
4. Cambio de estado por interacción
5. Simulación de proceso (delay + actualización)

---

## Estados

* visible
* oculto
* retirado
* desindexado

El cambio de estado se simula, no se ejecuta externamente.

---

## Consideraciones

* Sin APIs externas
* Sin IA real
* Sin procesamiento distribuido
* Lógica orientada a demo

El valor del proyecto está en la coherencia del flujo y la simulación del sistema.
