/**
 * Safe API response parser to prevent "Unexpected end of JSON input" errors.
 */
export async function safeParseJson<T = any>(
  res: Response,
  fallback: T = {} as T
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  try {
    const text = await res.text();
    if (!text || text.trim().length === 0) {
      return {
        ok: res.ok,
        status: res.status,
        data: fallback,
        error: res.ok ? undefined : `Server returned empty response (${res.status})`,
      };
    }

    try {
      const data = JSON.parse(text);
      return {
        ok: res.ok,
        status: res.status,
        data,
        error: !res.ok ? (data?.error || `Request failed with status ${res.status}`) : undefined,
      };
    } catch {
      // Body is not JSON (e.g., HTML error page, 502/504 gateway error)
      return {
        ok: false,
        status: res.status,
        data: fallback,
        error: res.ok
          ? "Received non-JSON response from server."
          : `Server error (${res.status}): ${text.slice(0, 120)}`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      status: res.status || 0,
      data: fallback,
      error: err?.message || "Failed to read response from server.",
    };
  }
}
