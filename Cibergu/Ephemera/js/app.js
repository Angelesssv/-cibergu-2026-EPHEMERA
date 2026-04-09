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
const apiDecryptData = (encryptedText) => fetchAPI('/decrypt', 'POST', { data: encryptedText });

// --- HELPER DE ESTADOS VISUALES ---
const getBadgeHTML = (status) => {
    const states = {
        'visible': 'badge-visible',
        'ocultado': 'badge-oculto',
        'retirado': 'badge-retirado',
        'desindexado': 'badge-desindexado',
        'alto': 'badge-retirado',
        'medio': 'badge-oculto',  
        'bajo': 'badge-visible'   
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
    if (!kpiDetectados) return;

    kpiDetectados.innerText = "...";
    document.getElementById('kpi-ocultados').innerText = "...";
    document.getElementById('kpi-incidencias').innerText = "...";
    document.getElementById('kpi-exposicion').innerText = "...";

    const [elements, incidents, activity] = await Promise.all([
        apiGetElements(APP_CONFIG.currentCaseId),
        apiGetIncidents(),
        apiGetActivity()
    ]);

    const dataElements = elements || [];
    const dataIncidents = incidents || [];
    const dataActivity = activity || [];

    const totalDetectados = dataElements.length;
    const totalOcultados = dataElements.filter(el => el.visibility_status !== 'visible').length; 
    const totalIncidencias = dataIncidents.length;
    
    let nivelExposicion = "Bajo";
    let colorExposicion = "var(--success, #10B981)";
    if (totalIncidencias >= 5) {
        nivelExposicion = "Alto";
        colorExposicion = "var(--danger)";
    } else if (totalIncidencias > 0) {
        nivelExposicion = "Medio";
        colorExposicion = "var(--warning)";
    }

    kpiDetectados.innerText = totalDetectados;
    document.getElementById('kpi-ocultados').innerText = totalOcultados;
    document.getElementById('kpi-incidencias').innerText = totalIncidencias;
    
    const kpiExp = document.getElementById('kpi-exposicion');
    kpiExp.innerText = nivelExposicion;
    kpiExp.style.color = colorExposicion;

    const activityList = document.getElementById('dashboard-activity-list');
    activityList.innerHTML = ''; 

    if (dataActivity.length === 0) {
        activityList.innerHTML = '<li style="padding: 12px 0; color: var(--text-muted); font-size: 0.875rem;">No hay actividad reciente.</li>';
        return;
    }

    dataActivity.slice(0, 3).forEach((log, index) => {
        const isLast = index === 2 || index === dataActivity.length - 1;
        const borderStyle = isLast ? '' : 'border-bottom: 1px solid var(--border-primary);';
        
        let titleColor = "var(--text-primary)";
        let titleText = log.action;
        if (log.action === 'change_visibility') {
            titleText = `Cambio de estado: ${log.new_value}`;
            if (log.new_value !== 'visible') titleColor = "var(--warning)";
        } else if (log.action === 'create') {
            titleText = "Nuevo elemento monitorizado";
            titleColor = "var(--accent)"; 
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

// ==========================================
// --- MOTOR DE SIMULACIÓN Y CIFRADO (HUELLA DIGITAL) ---
// ==========================================
const HuellaState = {
    decryptedItems: new Map(), // CLAVE: Debe ser Map(), no Set()
    processingItems: {} 
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

window.revealData = async (itemId, encryptedValue) => {
    if (HuellaState.decryptedItems.has(itemId)) return;

    const btn = document.getElementById(`btn-crypto-${itemId}`);
    if (btn) {
        btn.innerText = "⏳ Decrypting...";
        btn.disabled = true;
        btn.style.opacity = "0.5";
    }

    HuellaState.processingItems[itemId] = { step: "Decrypt request initiated" };
    console.log(`[${itemId}] Access requested`); 

    try {
        const res = await apiDecryptData(encryptedValue);
        
        if (res && res.decrypted) {
            HuellaState.decryptedItems.set(itemId, res.decrypted);
            console.log(`[${itemId}] Data decrypted`);
            HuellaState.processingItems[itemId] = { step: "Access granted" };
        } else {
            alert("Error: Integridad de cifrado comprometida.");
        }
    } catch (e) {
        console.error("Error en descifrado:", e);
    }

    delete HuellaState.processingItems[itemId];
    renderHuellaTable();
};

// --- RENDERIZADO: HUELLA DIGITAL ---
const renderHuellaTable = async () => {
    const tbody = document.getElementById('table-elements-body');
    if (!tbody) return;

    if (!document.getElementById('security-banner')) {
        const topbar = document.querySelector('.topbar');
        if (topbar) {
            const banner = document.createElement('div');
            banner.id = 'security-banner';
            banner.innerHTML = `<span style="font-size: 0.75rem; color: #10B981; font-family: monospace;">🔒 All identifiers are processed in encrypted form (AES-256)</span>`;
            topbar.appendChild(banner);
        }
    }

    if (tbody.innerHTML.trim() === '') {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;">Conectando con FastAPI...</td></tr>`;
    }

    const elements = await apiGetElements(APP_CONFIG.currentCaseId);
    
    if (!elements || elements.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #9CA3AF;">No hay elementos en la base de datos.</td></tr>`;
        return;
    }

    tbody.innerHTML = ''; 
    elements.forEach(el => {
        const tr = document.createElement('tr');
        
        const isProcessing = HuellaState.processingItems[el.id];

        if(el.visibility_status === 'retirado') tr.style.opacity = '0.4';
        if(el.visibility_status === 'ocultado') tr.style.opacity = '0.7';

        const encryptedData = String(el.value || "gAAAAA_DATA_MISSING");
        const originalData = HuellaState.decryptedItems.get(el.id) || null;
        const isDecrypted = !!originalData;

        const cryptoContent = isDecrypted 
            ? `<span style="font-family: monospace; color: #10B981;">Decrypted: ${originalData}</span>`
            : `<span style="font-family: monospace; color: #6B7280; user-select: none;">Encrypted: ${encryptedData.slice(0, 25)}...</span>`;

        const cryptoLabel = isDecrypted 
            ? `<span style="font-size: 0.7rem; color: #10B981; margin-bottom: 4px; display: block; font-weight: bold;">CONTENT REVEALED (SERVER SECURED)</span>`
            : `<span style="font-size: 0.7rem; color: #EF4444; margin-bottom: 4px; display: block; font-weight: bold;">CONTENT PROTECTED (AES-256)</span>`;

        const safeDataForButton = encryptedData.replace(/'/g, "\\'");

        const decryptButton = isDecrypted 
            ? `` 
            : `<button id="btn-crypto-${el.id}" onclick="revealData('${el.id}', '${safeDataForButton}')" style="margin-top: 8px; background: transparent; border: 1px solid #3B82F6; color: #3B82F6; font-size: 0.7rem; padding: 4px 8px; border-radius: 4px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#3B82F6'; this.style.color='#fff';" onmouseout="this.style.background='transparent'; this.style.color='#3B82F6';">
                  Reveal sensitive data
               </button>`;

        let actionColumn = '';
        if (isProcessing) {
            actionColumn = `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="color: #3B82F6; font-size: 0.8rem; font-weight: bold; animation: pulse 1.5s infinite;">Processing...</span>
                    <span style="color: #9CA3AF; font-size: 0.7rem;">${isProcessing.step}</span>
                </div>
            `;
        } else {
            actionColumn = `
                <select class="status-selector btn-secondary" data-id="${el.id}" style="padding: 4px; border-radius: 4px; font-size:0.75rem;" ${['retirado', 'desindexado'].includes(el.visibility_status) ? 'disabled' : ''}>
                    <option value="" disabled ${!['visible','ocultado','retirado','desindexado'].includes(el.visibility_status) ? 'selected' : ''}>Cambiar estado</option>
                    <option value="visible" ${el.visibility_status === 'visible' ? 'selected' : ''}>Visible</option>
                    <option value="ocultado" ${el.visibility_status === 'ocultado' ? 'selected' : ''}>Ocultar</option>
                    <option value="retirado" ${el.visibility_status === 'retirado' ? 'selected' : ''}>Retirar</option>
                    <option value="desindexado" ${el.visibility_status === 'desindexado' ? 'selected' : ''}>Desindexar</option>
                </select>
            `;
        }

        tr.innerHTML = `
            <td style="vertical-align: middle;"><span style="text-transform: capitalize;">${el.type || 'N/A'}</span></td>
            <td style="max-width: 300px; vertical-align: middle;">
                ${cryptoLabel}
                ${cryptoContent}
                <br>
                ${decryptButton}
            </td>
            <td style="vertical-align: middle; color: #9CA3AF;">API Backend</td>
            <td style="vertical-align: middle;">${getBadgeHTML(el.visibility_status)}</td>
            <td style="vertical-align: middle;">${actionColumn}</td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.status-selector').forEach(select => {
        select.addEventListener('change', async (e) => {
            const elementId = e.target.getAttribute('data-id');
            const newStatus = e.target.value;
            
            HuellaState.processingItems[elementId] = { step: "Queued for processing" };
            renderHuellaTable();
            
            await sleep(randomDelay(400, 900));
            HuellaState.processingItems[elementId].step = "Validating ownership...";
            renderHuellaTable();

            await sleep(randomDelay(900, 1200));
            HuellaState.processingItems[elementId].step = "Encrypting sensitive data (AES)";
            renderHuellaTable();

            await sleep(randomDelay(1200, 1500));
            HuellaState.processingItems[elementId].step = "Rewriting secure state";
            HuellaState.decryptedItems.delete(elementId); 
            renderHuellaTable();

            await sleep(randomDelay(1500, 2200));
            HuellaState.processingItems[elementId].step = "Propagating changes to network...";
            renderHuellaTable();
            await sleep(randomDelay(800, 1200));

            await apiUpdateVisibility(elementId, newStatus, APP_CONFIG.currentUserId);
            
            delete HuellaState.processingItems[elementId];
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
        
        let elementValue = log.element_value ? log.element_value : 'Elemento desconocido';
        
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
});