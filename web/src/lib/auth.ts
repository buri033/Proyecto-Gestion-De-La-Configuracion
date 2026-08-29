export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
}

export interface Session {
  token: string;
  user: AuthUser;
}

type AuthCallback = (session: Session | null) => void;
const listeners = new Set<AuthCallback>();

const TOKEN_KEY = 'banco_session_token';
const USER_KEY = 'banco_session_user';

export const auth = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  },

  getSession(): Session | null {
    const token = this.getToken();
    const user = this.getUser();
    if (!token || !user) return null;
    return { token, user };
  },

  setSession(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    const session = { token, user };
    listeners.forEach((cb) => cb(session));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    listeners.forEach((cb) => cb(null));
  },

  onAuthStateChange(callback: AuthCallback) {
    listeners.add(callback);
    return {
      unsubscribe: () => {
        listeners.delete(callback);
      },
    };
  },
};
