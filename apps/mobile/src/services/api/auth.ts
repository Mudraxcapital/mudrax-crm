import { getApi } from "./client";

export const authApi = {
  getCsrfToken: () => getApi().auth.getCsrfToken(),
  getSession: () => getApi().auth.getSession(),
  getSessionStatus: () => getApi().auth.getSessionStatus(),
  signInWithCredentials: (email: string, password: string) =>
    getApi().auth.signInWithCredentials({ email, password }),
  signOut: () => getApi().auth.signOut(),
};
