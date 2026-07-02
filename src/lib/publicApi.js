import { mockApiFetch } from "./mockApi"

/**
 * PUBLIC API CLIENT
 * ─────────────────
 * For the public real-time status screen. These endpoints do NOT require
 * authentication, so we use a plain `fetch` with NO Authorization header.
 *
 * In demo mode (VITE_USE_MOCK !== "false") the in-memory mock backend answers
 * so the screen is fully functional without a running server.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1"

const USE_MOCK = import.meta.env.VITE_USE_MOCK ? import.meta.env.VITE_USE_MOCK !== "false" : true

/**
 * Fetch a public resource. No JWT is attached.
 * @param {string} path e.g. "/public/laboratories/status"
 */
export async function publicFetch(path) {
  if (USE_MOCK) {
    return mockApiFetch(path, { method: "GET" })
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
  } catch (networkError) {
    const err = new Error("No se pudo conectar con el servidor.")
    err.cause = networkError
    err.status = 0
    throw err
  }

  if (!response.ok) {
    const err = new Error(`Error ${response.status}`)
    err.status = response.status
    throw err
  }

  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}
