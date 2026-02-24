/**
 * A thin wrapper around `fetch` that automatically detects HTTP 401
 * (Unauthorized) responses and dispatches a custom event so the app
 * can log the user out. Also throws on 403 (Forbidden) with a
 * user-friendly message.
 *
 * Usage: drop-in replacement for `fetch()`.
 */

const UNAUTHORIZED_EVENT = 'pacectrl:unauthorized'

/** Custom error thrown on 403 Forbidden responses. */
export class ForbiddenError extends Error {
  constructor() {
    super('You are not authorized to perform this action. Please contact your administrator.')
    this.name = 'ForbiddenError'
  }
}

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

  if (response.status === 403) {
    throw new ForbiddenError()
  }

  return response
}
