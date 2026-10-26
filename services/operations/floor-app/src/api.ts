// The APIs the floor reads from. Vite exposes VITE_* variables at build time.
// Backends are only reachable through Traefik: http://api.flisk-restaurant-example.localhost/api/<name without -api>/...
export const MENU_API_URL = import.meta.env.VITE_MENU_API_URL || 'http://api.flisk-restaurant-example.localhost/api/menu';
export const RESERVATION_API_URL = import.meta.env.VITE_RESERVATION_API_URL || 'http://api.flisk-restaurant-example.localhost/api/reservation';

export type FloorTable = {
  id: string;
  capacity: number;
  server: string;
  status: 'open' | 'seated' | 'hold';
  covers: number;
  turnMinutes: number;
};

export type MenuItem = {
  id: string;
  course: string;
  name: string;
  price: number;
  station: string;
  dietary: string[];
  available: boolean;
  remaining: number;
};

export type OperationsView = {
  floor: { tables: FloorTable[]; totals: { seated: number; holds: number; covers: number } };
  menu: { items: MenuItem[]; unavailable: MenuItem[] };
};

// One request, one parsed body. A non-2xx answer throws with the api's own error message.
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? `Request failed with ${response.status}`);
  return body as T;
}
