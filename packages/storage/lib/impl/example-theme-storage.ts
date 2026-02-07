import { createStorage, StorageEnum } from '../base/index.js';
import type { ThemeStateType, ThemeStorageType } from '../base/index.js';

const storage = createStorage<ThemeStateType>(
  'theme-storage-key',
  {
    theme: 'dark',
    isLight: false,
    themeName: 'default',
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const exampleThemeStorage: ThemeStorageType = {
  ...storage,
  toggle: async () => {
    await storage.set(currentState => {
      const newTheme = currentState.theme === 'light' ? 'dark' : 'light';

      return {
        ...currentState,
        theme: newTheme,
        isLight: newTheme === 'light',
      };
    });
  },
  setThemeName: async (themeName: string) => {
    await storage.set(currentState => ({
      ...currentState,
      themeName,
    }));
  },
};
