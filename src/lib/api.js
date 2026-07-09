import { mockApiFetch } from "./mockApi"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1"

/**
 * DEMO MODE
 * ─────────
 * While there is no backend, all requests are served by the in-memory mock in
 * ./mockApi.js (seeded with UCE data). When your real backend is ready, set
 * USE_MOCK to false (or define VITE_USE_MOCK="false") to hit the real API.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK
  ? import.meta.env.VITE_USE_MOCK !== "false"
  : true

const TOKEN_KEY = "labora_token"

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Centralized fetch wrapper.
 * - Prefixes API_BASE_URL
 * - Attaches Authorization: Bearer <token> from localStorage
 * - Parses JSON
 * - On failure, throws an Error whose message comes from the API error body
 *   { status, error, message, path }
 */
export async function apiFetch(path, options = {}) {
  // DEMO MODE: serve everything from the in-memory mock backend.
  if (USE_MOCK) {
    return mockApiFetch(path, options)
  }

  const token = getToken()
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
    })
  } catch (networkError) {
    const err = new Error("No se pudo conectar con el servidor. Verifica tu conexión.")
    err.cause = networkError
    err.status = 0
    throw err
  }

  // No content
  if (response.status === 204) return null

  let payload = null
  const text = await response.text()
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const message =
      (payload && payload.message) ||
      (typeof payload === "string" ? payload : null) ||
      `Error ${response.status}`
    const err = new Error(message)
    err.status = response.status
    err.error = payload && payload.error
    err.path = payload && payload.path
    err.payload = payload
    throw err
  }

  return payload
}

export const api = {
  get: (path, options) => apiFetch(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiFetch(path, { ...options, method: "POST", body }),
  put: (path, body, options) => apiFetch(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => apiFetch(path, { ...options, method: "PATCH", body }),
  del: (path, options) => apiFetch(path, { ...options, method: "DELETE" }),
}
