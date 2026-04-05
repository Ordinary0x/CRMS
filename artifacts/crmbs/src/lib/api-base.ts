const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const apiBase = rawApiBase ? rawApiBase.replace(/\/+$/, "") : "";

export function withApiBase(path: string): string {
  if (!path.startsWith("/")) return path;
  return apiBase ? `${apiBase}${path}` : path;
}
