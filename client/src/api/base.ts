import { getAuthData } from "./auth";

const API_BASE = "http://localhost:5000/api";

async function getToken() {
    return (await getAuthData())?.auth?.token;
}

async function getWithAuth(endpoint: string) {
    const token = await getToken();
    if (!token) throw new Error("Missing auth token");

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`GET ${endpoint} failed: ${response.status}`);
    }
    return response.json();
}

async function postWithAuth(endpoint: string, body: any) {
    const token = await getToken();
    if (!token) throw new Error("Missing auth token");

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`POST ${endpoint} failed: ${response.status}`);
    }
    return response.json();
}

async function apiPost(endpoint: string, body: any) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`POST ${endpoint} failed: ${response.status}`);
    }
    return response.json();
}
export { getWithAuth, postWithAuth, apiPost };
