const ADMIN_KEY = 'shift_app_admin';

export function getAdminSession(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_KEY) === 'true';
}

export function saveAdminSession() {
  localStorage.setItem(ADMIN_KEY, 'true');
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_KEY);
}
