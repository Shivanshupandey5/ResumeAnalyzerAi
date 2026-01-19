import { create } from "zustand";

declare global {
  interface Window {
    puter: any;
  }
}

const getPuter = () =>
  typeof window !== "undefined" && window.puter ? window.puter : null;

export const usePuterStore = create<any>((set, get) => ({
  isLoading: false,
  error: null,
  puterReady: false,

  // 🔹 INIT (THIS FIXES YOUR CRASH)
  init: () => {
    const puter = getPuter();
    if (!puter) {
      set({ error: "Puter.js not available" });
      return;
    }
    set({ puterReady: true });
  },

  fs: {
    upload: (files: File[] | Blob[]) => getPuter()?.fs.upload(files),
    write: (p: string, d: any) => getPuter()?.fs.write(p, d),
    read: (p: string) => getPuter()?.fs.read(p),
    delete: (p: string) => getPuter()?.fs.delete(p),
    readDir: (p: string) => getPuter()?.fs.readdir(p),
  },

  ai: {
    chat: (
      prompt: any,
      imageURL?: any,
      testMode?: boolean,
      options?: any
    ) => getPuter()?.ai.chat(prompt, imageURL, testMode, options),

    img2txt: (image: string | File | Blob, testMode?: boolean) =>
      getPuter()?.ai.img2txt(image, testMode),
  },

  kv: {
    get: (k: string) => getPuter()?.kv.get(k),
    set: (k: string, v: string) => getPuter()?.kv.set(k, v),
    delete: (k: string) => getPuter()?.kv.delete(k),
    list: (p: string, rv?: boolean) => getPuter()?.kv.list(p, rv),
    flush: () => getPuter()?.kv.flush(),
  },

  clearError: () => set({ error: null }),
}));
