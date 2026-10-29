/**
 * DevShield AI - Resilient API Client Utility
 * Handles empty bodies, invalid JSON, network dropouts, proxy errors,
 * and extracts user-friendly error messages instead of throwing uncaught SyntaxErrors.
 */

export async function safeApiRequest(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (networkError) {
    console.error(`[DevShield API] Network error calling ${url}:`, networkError);
    throw new Error(
      `Cannot connect to DevShield backend (${networkError.message || 'Connection refused'}). Please ensure the FastAPI server is running on http://127.0.0.1:8000.`
    );
  }

  // Read response text safely first
  let rawText = '';
  try {
    rawText = await response.text();
  } catch (readError) {
    throw new Error(`Failed to read response data from server (${response.status} ${response.statusText}).`);
  }

  // Attempt JSON parsing if content exists
  let parsedJson = null;
  const trimmed = rawText.trim();
  const contentType = response.headers.get('content-type') || '';

  if (trimmed) {
    if (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        parsedJson = JSON.parse(trimmed);
      } catch (parseError) {
        console.error(`[DevShield API] Malformed JSON from ${url}:`, trimmed.slice(0, 300));
        throw new Error(
          `Server returned invalid JSON (${response.status} ${response.statusText}). Error: ${parseError.message}`
        );
      }
    } else {
      // Non-JSON response (e.g. Vite proxy ECONNREFUSED HTML, Nginx error, or plain text)
      const cleanMessage = trimmed
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!response.ok) {
        throw new Error(
          `Backend error (${response.status}): ${cleanMessage.slice(0, 200) || response.statusText}`
        );
      }
      throw new Error(`Server returned unexpected content type: ${contentType || 'non-JSON text'}`);
    }
  }

  // Handle HTTP error statuses
  if (!response.ok) {
    if ((response.status === 502 || response.status === 504) && (!parsedJson || !trimmed)) {
      throw new Error(
        'Cannot connect to DevShield backend (502 Bad Gateway). The FastAPI server is not responding on port 8000. Please start it using: cd DevShield-AI/backend; uvicorn app.main:app --port 8000'
      );
    }

    let detailMsg = response.statusText || `Request failed with HTTP ${response.status}`;
    if (parsedJson) {
      if (typeof parsedJson.detail === 'string') {
        detailMsg = parsedJson.detail;
      } else if (Array.isArray(parsedJson.errors)) {
        detailMsg = parsedJson.errors.join('; ');
      } else if (parsedJson.message) {
        detailMsg = parsedJson.message;
      }
    }
    throw new Error(detailMsg);
  }

  // For 204 No Content
  if (response.status === 204 || !parsedJson) {
    if (!trimmed) {
      throw new Error('Server returned an empty response body.');
    }
  }

  return parsedJson;
}
