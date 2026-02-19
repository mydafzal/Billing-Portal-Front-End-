import { getAccessToken } from './token';

export type UserRole = 'superadmin' | 'admin' | 'viewer';

export interface DecodedToken {
    exp: number;
    iat: number;
    sub: string;
    role: UserRole;
    client_id?: string;
    email: string;
}

export function decodeJWT(token: string): DecodedToken | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

export function getUserRole(): UserRole | null {
    const token = getAccessToken();
    if (!token) return null;
    const decoded = decodeJWT(token);
    return decoded?.role || null;
}

export function getClientId(): string | null {
    const token = getAccessToken();
    if (!token) return null;
    const decoded = decodeJWT(token);
    return decoded?.client_id || null;
}

export function hasRole(requiredRoles: UserRole[]): boolean {
    const role = getUserRole();
    return role ? requiredRoles.includes(role) : false;
}
