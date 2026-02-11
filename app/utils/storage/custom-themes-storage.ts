import { createStorage } from "./base";
import { StorageEnum } from "./enums";
import type { CustomTheme, CustomThemesStateType, CustomThemesStorageType } from "./types";

const storage = createStorage<CustomThemesStateType>(
  "custom-themes-storage-key",
  { themes: [] },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const customThemesStorage: CustomThemesStorageType = {
  ...storage,
  addTheme: async (theme: CustomTheme) => {
    await storage.set(state => ({
      ...state,
      themes: [...state.themes, theme],
    }));
  },
  updateTheme: async (id: string, updates: Partial<Pick<CustomTheme, "name" | "variables">>) => {
    await storage.set(state => ({
      ...state,
      themes: state.themes.map(t => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },
  deleteTheme: async (id: string) => {
    await storage.set(state => ({
      ...state,
      themes: state.themes.filter(t => t.id !== id),
    }));
  },
};
