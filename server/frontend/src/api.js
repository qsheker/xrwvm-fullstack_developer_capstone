export async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (options.method && options.method !== "GET") {
    const session = await fetch("/djangoapp/session", { credentials: "same-origin" });
    if (!session.ok) throw new Error("Unable to connect. Please try again.");
    headers["X-CSRFToken"] = (await session.json()).csrfToken;
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, { credentials: "same-origin", ...options, headers });
  let data;
  try { data = await response.json(); }
  catch (error) { if (error.name === "AbortError") throw error; throw new Error("The service returned an invalid response. Please try again."); }
  if (!response.ok) throw new Error(data.message || data.error || "The request failed.");
  return data;
}
