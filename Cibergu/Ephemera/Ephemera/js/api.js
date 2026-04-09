import { APP_CONFIG } from 'settings.js';

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
        console.error("Error de red:", error);
        return null;
    }
};

export const apiGetUsers = () => fetchAPI('/users');

export const apiGetElements = (caseId) => fetchAPI(`/elements/${caseId}`);

// CORRECCIÓN: El backend espera Query Parameters en lugar de un JSON Body
export const apiCreateElement = (data) => fetchAPI('/elements', 'POST', data);

export const apiUpdateVisibility = (elementId, newStatus, userId) => 
    fetchAPI(`/elements/${elementId}/visibility?new_status=${newStatus}&user_id=${userId}`, 'PUT');

export const apiGetActivity = (elementId) => fetchAPI(`/activity/${elementId}`);