"use client";
import { create } from "zustand";

export const useCanteenStore = create((set, get) => ({
  byId: {},                 // { [id]: canteenRow }
  setCanteen(id, data) {
    set((s) => ({ byId: { ...s.byId, [id]: data } }));
  },
  getCanteen(id) {
    return get().byId[id];
  },
  clear() { set({ byId: {} }); },
}));
