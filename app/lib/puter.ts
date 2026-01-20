import { create } from "zustand";

declare global {
  interface Window {
    puter: any;
  }
}

const getPuter = () =>
  typeof window !== "undefined" && window.puter ? window.puter : null;

type AuthState = {
  isAuthenticated: boolean;
  user: any | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

type PuterStore = {
  isLoading: boolean;
  error: string | null;
  puterReady: boolean;

  auth: AuthState;

  init: () => Promise<void>;

  fs: {
    upload: (files: File[] | Blob[]) => Promise<any>;
    write: (p: string, d: any) => Promise<any>;
    read: (p: string) => Promise<any>;
    delete: (p: string) => Promise<any>;
    readDir: (p: string) => Promise<any>;
  };

  ai: {
    chat: (...args: any[]) => Promise<any>;
    img2txt: (image: string | File | Blob, testMode?: boolean) => Promise<any>;
  };

  kv: {
    get: (k: string) => Promise<any>;
    set: (k: string, v: string) => Promise<any>;
    delete: (k: string) => Promise<any>;
    list: (p: string, rv?: boolean) => Promise<any>;
    flush: () => Promise<any>;
  };

  clearError: () => void;
};

export const usePuterStore = create<PuterStore>((set, get) => ({
  isLoading: true,
  error: null,
  puterReady: false,

  auth: {
    isAuthenticated: false,
    user: null,

    signIn: async () => {
      const puter = getPuter();
      if (!puter) return;
      set({ isLoading: true });
      await puter.auth.signIn();
      await get().init();
    },

    signOut: async () => {
      const puter = getPuter();
      if (!puter) return;
      set({ isLoading: true });
      await puter.auth.signOut();
      set({
        auth: { ...get().auth, isAuthenticated: false, user: null },
        isLoading: false,
      });
    },
  },

  // 🔑 SINGLE SOURCE OF TRUTH FOR AUTH
  init: async () => {
    const puter = getPuter();
    if (!puter) {
      set({ error: "Puter.js not available", isLoading: false });
      return;
    }

    try {
      const signedIn = await puter.auth.isSignedIn();

      if (signedIn) {
        const user = await puter.auth.getUser();
        set({
          auth: { ...get().auth, isAuthenticated: true, user },
          puterReady: true,
          isLoading: false,
        });
      } else {
        set({
          auth: { ...get().auth, isAuthenticated: false, user: null },
          puterReady: true,
          isLoading: false,
        });
      }
    } catch (err: any) {
      set({
        error: err?.message || "Auth init failed",
        isLoading: false,
      });
    }
  },

  fs: {
    upload: (files) => getPuter()!.fs.upload(files),
    write: (p, d) => getPuter()!.fs.write(p, d),
    read: (p) => getPuter()!.fs.read(p),
    delete: (p) => getPuter()!.fs.delete(p),
    readDir: (p) => getPuter()!.fs.readdir(p),
  },

  ai: {
    chat: (...args) => getPuter()!.ai.chat(...args),
    img2txt: (image, testMode) =>
      getPuter()!.ai.img2txt(image, testMode),
  },

  kv: {
    get: (k) => getPuter()!.kv.get(k),
    set: (k, v) => getPuter()!.kv.set(k, v),
    delete: (k) => getPuter()!.kv.delete(k),
    list: (p, rv) => getPuter()!.kv.list(p, rv),
    flush: () => getPuter()!.kv.flush(),
  },

  clearError: () => set({ error: null }),
}));
