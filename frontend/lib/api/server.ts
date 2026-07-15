// Server-only: uses internal API_URL (not exposed to client)
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

export async function fetchApi<T>(
  path: string,
  options?: { revalidate?: number; tags?: string[] }
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: {
        revalidate: options?.revalidate ?? 600,
        tags: options?.tags,
      },
    });

    if (!res.ok) {
      console.error(`API ${res.status}: ${path}`);
      return null;
    }

    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`fetchApi failed for ${path}:`, err);
    return null;
  }
}
