import { createStorage } from "./base";
import { StorageEnum } from "./enums";
import type { ZoomStateType, ZoomStorageType } from "./types";

const ZOOM_MIN = 50;
const ZOOM_MAX = 150;
const ZOOM_STEP = 10;

const clamp = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));

const storage = createStorage<ZoomStateType>(
  "zoom-storage-key",
  { zoomLevel: 100 },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const zoomStorage: ZoomStorageType = {
  ...storage,
  setZoomLevel: async (level: number) => {
    await storage.set(currentState => ({
      ...currentState,
      zoomLevel: clamp(level),
    }));
  },
};

export { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP };
