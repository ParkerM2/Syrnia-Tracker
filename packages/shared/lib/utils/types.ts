import type { COLORS } from './const.js';
import type { TupleToUnion } from 'type-fest';

export interface CombatExpGain {
  skill: string;
  exp: string; // The gained exp amount
  totalExp?: string; // The total exp for this skill (from level info)
  skillLevel?: string; // The skill level (from level info)
  expForNextLevel?: string; // Exp needed for next level (from level info)
}

export interface EquipmentItem {
  slot: string; // e.g., "helm", "shield", "body", "weapon", "legs", "gloves", "boots", "horse"
  name: string; // Item name
  stats?: string; // Stats text (e.g., "40", "167/160")
  enchant?: string; // Enchant value (e.g., "4 Aim")
  imageUrl?: string; // Image URL from background-image or background style
  title?: string; // Full title attribute
}

export interface EquipmentData {
  helm?: EquipmentItem;
  shield?: EquipmentItem;
  body?: EquipmentItem;
  weapon?: EquipmentItem; // displayHand
  legs?: EquipmentItem;
  gloves?: EquipmentItem;
  boots?: EquipmentItem;
  horse?: EquipmentItem;
  trophy?: EquipmentItem;
  totals: {
    armour?: number;
    aim?: number;
    power?: number;
    travelTime?: number;
  };
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
  uuid: string; // Unique identifier for this screen scrape (UUID v4)
  monster?: string; // Name of the monster being fought
  location?: string; // Location name where fighting
  damageDealt?: string[]; // Array of damage dealt by player (from fight log)
  damageReceived?: string[]; // Array of damage received by player (from fight log)
  peopleFighting?: number | null; // Number of people fighting at the location (from "There are X people fighting here")
  totalFights?: number; // Total number of fights completed (incremented when fight ends)
  totalInventoryHP?: string; // Current HP value from inventory (saved as-is)
  hpUsed?: number; // HP used from fight log (parsed from "gained X HP" lines)
  equipment?: EquipmentData; // Equipment worn at fight end
}

export interface SkillStat {
  skill: string;
  level: string;
  totalExp: string;
  expForNextLevel: string;
  percentToNext: number; // 0-100
  expLeft: string;
  gainedThisHour?: string; // Current exp gained this hour
  gainedThisWeek?: string; // Weekly exp gained (resets 6pm Sunday EST)
  levelGainedThisWeek?: string; // Levels gained this week
}

export interface UserStats {
  username: string;
  timestamp: string;
  skills: Record<string, SkillStat>;
}
export type * from 'type-fest';
export type ColorType = 'success' | 'info' | 'error' | 'warning' | keyof typeof COLORS;
export type ExcludeValuesFromBaseArrayType<B extends string[], E extends (string | number)[]> = Exclude<
  TupleToUnion<B>,
  TupleToUnion<E>
>[];
export type ManifestType = chrome.runtime.ManifestV3;
