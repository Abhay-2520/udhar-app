import { createContext, useContext, useMemo, useState } from 'react';
import { api, setToken as saveToken, getToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(null);

  async function requestOtp(phone) {
    return api('/auth/request-otp', { method: 'POST', body: { phone } });
  }

  async function verifyOtp(phone, otp) {
    const data = await api('/auth/verify-otp', { method: 'POST', body: { phone, otp } });
    saveToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
  }

  function logout() {
    saveToken(null);
    setTokenState(null);
    setUser(null);
  }

  const value = useMemo(() => ({ token, user, requestOtp, verifyOtp, logout }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
