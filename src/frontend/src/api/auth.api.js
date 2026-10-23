import { apiRequest } from './client';

/** POST /api/auth/login -> { token, user: { username, full_name, role, center_id, center_name } } */
export const login = (username, password) => apiRequest('/auth/login', { method: 'POST', body: { username, password } });
