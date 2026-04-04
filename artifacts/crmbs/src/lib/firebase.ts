// Firebase replaced with custom JWT auth.
// This file is kept as a compatibility stub.

export const auth = {
  currentUser: null as { getIdToken: () => Promise<string> } | null,
  signOut: async () => {
    localStorage.removeItem("crmbs_token");
    localStorage.removeItem("crmbs_user");
    window.location.href = "/login";
  },
};

export const app = null;
