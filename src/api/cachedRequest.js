const DEFAULT_TTL_MS = 5 * 60 * 1000

export function createCachedRequest(loader, { ttlMs = DEFAULT_TTL_MS } = {}) {
  let cachedResponse = null
  let cachedAt = 0
  let pendingRequest = null

  function clear() {
    cachedResponse = null
    cachedAt = 0
    pendingRequest = null
  }

  async function get({ force = false } = {}) {
    const now = Date.now()

    if (!force && cachedResponse && now - cachedAt < ttlMs) {
      return cachedResponse
    }

    if (!force && pendingRequest) {
      return pendingRequest
    }

    pendingRequest = loader()
      .then((response) => {
        cachedResponse = response
        cachedAt = Date.now()

        return response
      })
      .finally(() => {
        pendingRequest = null
      })

    return pendingRequest
  }

  return {
    get,
    clear
  }
}
