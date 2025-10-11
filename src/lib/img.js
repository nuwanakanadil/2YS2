export function normalizePic(src) {
  if (!src || typeof src !== "string") return "/profile2.png";
  const clean = src.replace(/\\/g, "/").trim();
  if (clean.startsWith("/")) return clean;
  if (/^https?:\/\//i.test(clean)) return clean;
  const base = process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000";
  return `${base.replace(/\/+$/, "")}/${clean.replace(/^\/+/, "")}`;
}
