/**
 * A thin wrapper around `fetch` that automatically detects HTTP 401
 * (Unauthorized) responses and dispatches a custom event so the app
 * can log the user out.
 *
 * Usage: drop-in replacement for `fetch()`.
 */

const UNAUTHORIZED_EVENT = 'pacectrl:unauthorized'

export function dispatchUnauthorized() {
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
}

export function onUnauthorized(callback: () => void) {
  window.addEventListener(UNAUTHORIZED_EVENT, callback)
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, callback)
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init)

  if (response.status === 401) {
    dispatchUnauthorized()
  }

  return response
}
