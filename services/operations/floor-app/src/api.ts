// The APIs the floor reads from. Vite exposes VITE_* variables at build time; the defaults match the ports in
// service.json so the app runs against `tdk up` without configuration.
// On a local flisk up the page is on *.localhost and the apis are on their own ports. On a live link the page is on the
// tunnel, and each api is reached on the same origin under its service name (/menu-api, /reservation-api).
const local = typeof location !== 'undefined' && /(^|\.)localhost$/.test(location.hostname);
export const MENU_API_URL = import.meta.env.VITE_MENU_API_URL || (local ? 'http://localhost:4120' : '/menu-api');
export const RESERVATION_API_URL = import.meta.env.VITE_RESERVATION_API_URL || (local ? 'http://localhost:4100' : '/reservation-api');

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
