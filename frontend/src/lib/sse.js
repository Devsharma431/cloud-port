const API = '/api';

// POST json to an SSE endpoint and invoke onDelta for each text chunk.
// Resolves with the full text; rejects with an Error carrying a user-facing message.
export async function streamSSE(path, body, onDelta, signal) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      detail = err.detail || err.message || JSON.stringify(err);
    } catch {
      try { detail = await res.text(); } catch {}
    }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop();
    for (const ev of events) {
      const line = ev.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const payload = JSON.parse(line.slice(6));
      if (payload.error) throw new Error(payload.error);
      if (payload.delta) {
        full += payload.delta;
        onDelta(payload.delta, full);
      }
    }
  }
  return full;
}
