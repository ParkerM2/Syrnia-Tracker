import type { COLORS } from './const.js';
import type { TupleToUnion } from 'type-fest';

export interface CombatExpGain {
  skill: string;
  exp: string; // The gained exp amount
  totalExp?: string; // The total exp for this skill (from level info)
  skillLevel?: string; // The skill level (from level info)
  expForNextLevel?: string; // Exp needed for next level (from level info)
}

export interface ScreenData {
  actionText: {
    speedText: string;
    currentActionText: string;
    exp: string;
    addExp: string;
    skillLevel?: string;
    expForNextLevel?: string;
    inventory: {
      hp: string;
      farmingExp: string;
    };
    combatExp: CombatExpGain[];
    drops: string[];
  };
  images: string[];
  links: string[];
  timestamp: string;
  monster?: string; // Name of the monster being fought
  location?: string; // Location name where fighting
  damageDealt?: string[]; // Array of damage dealt by player (from fight log)
  damageReceived?: string[]; // Array of damage received by player (from fight log)
}
export type * from 'type-fest';
export type ColorType = 'success' | 'info' | 'error' | 'warning' | keyof typeof COLORS;
export type ExcludeValuesFromBaseArrayType<B extends string[], E extends (string | number)[]> = Exclude<
  TupleToUnion<B>,
  TupleToUnion<E>
>[];
export type ManifestType = chrome.runtime.ManifestV3;
