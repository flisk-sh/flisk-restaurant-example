// The two APIs the host stand reads from. Vite exposes VITE_* variables at build time; the defaults match the
// ports in service.json so the app runs against `tdk up` without configuration.
export const RESERVATION_API_URL = import.meta.env.VITE_RESERVATION_API_URL || 'http://localhost:4100';
export const MENU_API_URL = import.meta.env.VITE_MENU_API_URL || 'http://localhost:4120';

export type Reservation = {
  id: string;
  guestName: string;
  partySize: number;
  time: string;
  table: string | null;
  status: 'CONFIRMED' | 'WAITLISTED' | 'SEATED' | 'CANCELLED';
};

export type FloorTable = { id: string; capacity: number; server: string; status: 'open' | 'seated' | 'hold' };

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
