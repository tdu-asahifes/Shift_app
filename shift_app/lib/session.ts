import { LoginUser } from './types';

const SESSION_KEY = 'shift_app_session';
const LOCATION_KEY = 'shift_app_location';

export function getSession(): LoginUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    const user: LoginUser = JSON.parse(data);
    const today = new Date().toISOString().split('T')[0];
    if (user.loginDate !== today) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function saveSession(user: LoginUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LOCATION_KEY);
}

export function getLocation(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(LOCATION_KEY);
}

export function saveLocation(locationId: string): void {
  sessionStorage.setItem(LOCATION_KEY, locationId);
}
