// --- CONFIGURACIÓN CON IDs REALES DE TU BASE DE DATOS ---
const APP_CONFIG = {
    apiBaseUrl: "http://127.0.0.1:8000",
    currentCaseId: "case-1", 
    currentUserId: "123e4567-e89b-12d3-a456-426614174000" 
};

// --- CONEXIÓN HTTP ---
const fetchAPI = async (endpoint, method = 'GET', body = null) => {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${APP_CONFIG.apiBaseUrl}${endpoint}`, options);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Error conectando al backend:", error);
        return null;
    }
};

const apiGetElements = (caseId) => fetchAPI(`/elements/${caseId}`);
const apiCreateElement = (data) => fetchAPI('/elements', 'POST', data);
const apiUpdateVisibility = (elementId, newStatus, userId) => 
    fetchAPI(`/elements/${elementId}/visibility?new_status=${newStatus}&user_id=${userId}`, 'PUT');
const apiGetIncidents = () => fetchAPI('/incidents');
const apiGetActivity = () => fetchAPI('/activity');
const apiGetEvidences = (caseId) => fetchAPI(`/evidences/${caseId}`);

// --- HELPER DE ESTADOS VISUALES ---
const getBadgeHTML = (status) => {
    const states = {
        'visible': 'badge-visible',
        'ocultado': 'badge-oculto',
        'retirado': 'badge-retirado',
        'desindexado': 'badge-desindexado',
        'alto': 'badge-retirado', // Riesgo Alto
        'medio': 'badge-oculto',  // Riesgo Medio
        'bajo': 'badge-visible'   // Riesgo Bajo
    };
    const cssClass = states[status?.toLowerCase()] || 'badge-visible';
    return `<span class="badge ${cssClass}">${status || 'N/A'}</span>`;
};

const formatDate = (isoString) => {
    if (!isoString) return 'Fecha desconocida';
    const date = new Date(isoString);
    return date.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// --- RENDERIZADO: PANEL DE CONTROL (DASHBOARD) ---
const renderDashboard = async () => {
    const kpiDetectados = document.getElementById('kpi-detectados');
    if (!kpiDetectados) return; // Salida temprana si no estamos en el dashboard

    // Mostrar estado de carga
    kpiDetectados.innerText = "...";
    document.getElementById('kpi-ocultados').innerText = "...";
    document.getElementById('kpi-incidencias').innerText = "...";
    document.getElementById('kpi-exposicion').innerText = "...";

    // Llamadas concurrentes a la API para mayor velocidad
    const [elements, incidents, activity] = await Promise.all([
        apiGetElements(APP_CONFIG.currentCaseId),
        apiGetIncidents(), // Asumiendo que trae todas las incidencias
        apiGetActivity()
    ]);

    // Cálculos seguros (con fallback si falla la red)
    const dataElements = elements || [];
    const dataIncidents = incidents || [];
    const dataActivity = activity || [];

    const totalDetectados = dataElements.length;
    // Ocultados = cualquier cosa que no sea visible
    const totalOcultados = dataElements.filter(el => el.visibility_status !== 'visible').length; 
    const totalIncidencias = dataIncidents.length;
    
    // Lógica de exposición
    let nivelExposicion = "Bajo";
    let colorExposicion = "var(--success, #10B981)";
    if (totalIncidencias >= 5) {
        nivelExposicion = "Alto";
        colorExposicion = "var(--danger)";
    } else if (totalIncidencias > 0) {
        nivelExposicion = "Medio";
        colorExposicion = "var(--warning)";
    }

    // Inyectar KPIs
    kpiDetectados.innerText = totalDetectados;
    document.getElementById('kpi-ocultados').innerText = totalOcultados;
    document.getElementById('kpi-incidencias').innerText = totalIncidencias;
    
    const kpiExp = document.getElementById('kpi-exposicion');
    kpiExp.innerText = nivelExposicion;
    kpiExp.style.color = colorExposicion;

    // Renderizar Actividad Reciente (solo los últimos 3 eventos)
    const activityList = document.getElementById('dashboard-activity-list');
    activityList.innerHTML = ''; 

    if (dataActivity.length === 0) {
        activityList.innerHTML = '<li style="padding: 12px 0; color: var(--text-muted); font-size: 0.875rem;">No hay actividad reciente.</li>';
        return;
    }

    dataActivity.slice(0, 3).forEach((log, index) => {
        // Quitar el borde inferior al último elemento para respetar tu diseño
        const isLast = index === 2 || index === dataActivity.length - 1;
        const borderStyle = isLast ? '' : 'border-bottom: 1px solid var(--border-primary);';
        
        // Formateo del título del evento
        let titleColor = "var(--text-primary)";
        let titleText = log.action;
        if (log.action === 'change_visibility') {
            titleText = `Cambio de estado: ${log.new_value}`;
            if (log.new_value !== 'visible') titleColor = "var(--warning)";
        } else if (log.action === 'create') {
            titleText = "Nuevo elemento monitorizado";
            titleColor = "var(--accent)"; // Color azul
        }

        const li = document.createElement('li');
        li.style = `padding: 12px 0; display: flex; flex-direction: column; ${borderStyle}`;
        li.innerHTML = `
            <span style="font-size: 0.875rem; color: ${titleColor}; text-transform: capitalize;">${titleText}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${formatDate(log.timestamp)}</span>
        `;
        activityList.appendChild(li);
    });
};

// --- RENDERIZADO: HUELLA DIGITAL ---
const renderHuellaTable = async () => {
    const tbody = document.getElementById('table-elements-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;">Conectando con FastAPI...</td></tr>`;
    const elements = await apiGetElements(APP_CONFIG.currentCaseId);
    
    if (!elements || elements.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;">No hay elementos en la base de datos.</td></tr>`;
        return;
    }

    tbody.innerHTML = ''; 
    elements.forEach(el => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${el.type}</td>
            <td>${el.value}</td>
            <td>API Backend</td>
            <td>${getBadgeHTML(el.visibility_status)}</td>
            <td>
                <select class="status-selector btn-secondary" data-id="${el.id}" style="padding: 4px; border-radius: 4px; font-size:0.75rem;">
                    <option value="" disabled selected>Cambiar estado</option>
                    <option value="visible">Visible</option>
                    <option value="ocultado">Ocultar</option>
                    <option value="retirado">Retirar</option>
                    <option value="desindexado">Desindexar</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.status-selector').forEach(select => {
        select.addEventListener('change', async (e) => {
            const elementId = e.target.getAttribute('data-id');
            const newStatus = e.target.value;
            await apiUpdateVisibility(elementId, newStatus, APP_CONFIG.currentUserId);
            renderHuellaTable(); 
        });
    });
};

// --- RENDERIZADO: INCIDENCIAS ---
const renderIncidencias = async () => {
    const grid = document.getElementById('incidencias-grid');
    if (!grid) return;

    grid.innerHTML = `<p style="color:var(--text-muted);">Cargando incidencias...</p>`;
    const incidents = await apiGetIncidents();

    if (!incidents || incidents.length === 0) {
        grid.innerHTML = `<p style="color:var(--text-muted);">No hay incidencias registradas en la base de datos.</p>`;
        return;
    }

    grid.innerHTML = '';
    incidents.forEach(inc => {
        const riesgo = inc.type === 'reaparicion' ? 'Alto' : (inc.type === 'acoso' ? 'Alto' : 'Medio');
        const card = document.createElement('div');
        card.className = 'card';
        card.style = 'display: flex; flex-direction: column; justify-content: space-between;';
        card.innerHTML = `
            <div>
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.125rem; text-transform: capitalize;">${inc.type}</h3>
                    ${getBadgeHTML(riesgo)}
                </div>
                <div style="margin-bottom: 1.5rem; font-size: 0.875rem;">
                    <p style="margin-bottom: 0.5rem;"><span style="color: var(--text-muted);">Fuente:</span> ${inc.source || 'Desconocida'}</p>
                    <p><span style="color: var(--text-muted);">Fecha:</span> ${formatDate(inc.detected_at)}</p>
                </div>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button class="btn btn-secondary" style="flex: 1;">Ver Evidencia</button>
                <button class="btn btn-primary" style="flex: 1;">Analizar</button>
            </div>
        `;
        grid.appendChild(card);
    });
};

// --- RENDERIZADO: HISTORIAL ---
const renderHistorial = async () => {
    const tbody = document.getElementById('table-activity-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem;">Cargando historial...</td></tr>`;
    const logs = await apiGetActivity();

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem;">El registro de actividad está vacío.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    logs.forEach(log => {
        let actionFormat = log.action === 'change_visibility' ? 'Cambio Estado' : log.action;
        
        // Recuperamos el valor del elemento que cruzamos en el backend
        let elementValue = log.element_value ? log.element_value : 'Elemento desconocido';
        
        // Formateamos en dos líneas: El elemento afectado arriba, el cambio debajo
        let detailFormat = `
            <span style="color: #E2E8F0; font-weight: 500; display: block; margin-bottom: 2px;">${elementValue}</span>
            <span style="font-size: 0.8rem; color: #9CA3AF;">De '${log.old_value || 'N/A'}' a '${log.new_value || 'N/A'}'</span>
        `;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color: var(--text-secondary); vertical-align: middle;">${formatDate(log.timestamp)}</td>
            <td style="vertical-align: middle;"><span style="color: var(--accent); font-weight: 500; text-transform: capitalize;">${actionFormat}</span></td>
            <td style="vertical-align: middle;">${detailFormat}</td>
            <td style="font-size:0.75rem; color:var(--text-muted); vertical-align: middle;">${log.user_id.split('-')[0]}...</td>
        `;
        tbody.appendChild(tr);
    });
};

// --- RENDERIZADO: EVIDENCIAS ---
const renderEvidencias = async () => {
    const grid = document.getElementById('evidencias-grid');
    if (!grid) return;

    grid.innerHTML = `<p style="color:var(--text-muted);">Cargando evidencias...</p>`;
    
    const evidences = await apiGetEvidences(APP_CONFIG.currentCaseId);

    if (!evidences || evidences.length === 0) {
        grid.innerHTML = `<p style="color:var(--text-muted);">No hay evidencias registradas en la base de datos.</p>`;
        return;
    }

    grid.innerHTML = '';
    evidences.forEach(ev => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                <h3 style="font-size: 1rem;">${ev.type || 'Evidencia'}</h3>
                <span class="badge badge-visible" style="font-size: 0.7rem;">${ev.status || 'Registrado'}</span>
            </div>
            
            <img src="${ev.hash}" alt="Evidencia" style="width: 100%; height: 180px; object-fit: cover; border-radius: 6px; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.1);">
            
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.8;">
                <p><strong>Fuente:</strong> ${ev.source || 'Desconocida'}</p>
                <p><strong>Fecha:</strong> ${formatDate(ev.date)}</p>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button class="btn btn-secondary" style="flex: 1; font-size: 0.8rem;" onclick="window.open('${ev.hash}', '_blank')">Ver Registro Completo</button>
                <button class="btn btn-secondary" style="flex: 1; font-size: 0.8rem;" onclick="alert('Descarga segura iniciada para la evidencia: ${ev.id}')">Descargar</button>
            </div>
        `;
        grid.appendChild(card);
    });
};

// --- INICIALIZADOR GLOBAL (ENRUTADOR SIMPLE) ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('kpi-detectados')) {
        renderDashboard();
    }
    // Detectamos en qué página estamos según el ID que encontremos en el DOM
    if (document.getElementById('table-elements-body')) {
        renderHuellaTable();
        const btnAdd = document.getElementById('btn-add-element');
        if (btnAdd) {
            btnAdd.addEventListener('click', async () => {
                const type = prompt("Tipo (ej: alias, username, link):");
                if (!type) return;
                const value = prompt("Valor a monitorizar:");
                if (!value) return;

                await apiCreateElement({
                    case_id: APP_CONFIG.currentCaseId,
                    type: type,
                    value: value
                });
                renderHuellaTable(); 
            });
        }
    }

    if (document.getElementById('incidencias-grid')) {
        renderIncidencias();
    }

    if (document.getElementById('table-activity-body')) {
        renderHistorial();
    }

    if (document.getElementById('evidencias-grid')) {
        renderEvidencias();
    }
    if (document.getElementById('kpi-detectados')) {
        renderDashboard();
    }
});