import { SKILLS_ARRAY } from "@app/constants";
import type { ExcludeValuesFromBaseArrayType } from "@app/types";

export const excludeValuesFromBaseArray = <B extends string[], E extends (string | number)[]>(
  baseArray: B,
  excludeArray: E,
) => baseArray.filter(value => !excludeArray.includes(value)) as ExcludeValuesFromBaseArrayType<B, E>;

export const sleep = async (time: number) => new Promise(r => setTimeout(r, time));

export const skillExpRegex = (skill: string) => {
  const regex = new RegExp(`${skill} level: ([\\d,]+) \\(([\\d,]+) exp, ([\\d,]+) for next level\\)`);
  return regex;
};

export interface SkillInfo {
  skill: string;
  exp: string;
  level: string;
  expForNextLevel: string;
}

export const matchText = (text: string): SkillInfo => {
  const result: SkillInfo = { skill: "", exp: "", level: "", expForNextLevel: "" };
  const skillList = SKILLS_ARRAY.filter((item: string) => text.includes(item));

  skillList?.forEach((item: string) => {
    const expRegex = skillExpRegex(item);
    const expMatch = text.match(expRegex);
    if (expMatch && expMatch[1] && expMatch[2] && expMatch[3]) {
      result.level = expMatch[1].replace(/,/g, "");
      result.exp = expMatch[2].replace(/,/g, "");
      result.expForNextLevel = expMatch[3].replace(/,/g, "");
      result.skill = item;
    }
  });

  return result;
};

/**
 * Normalize location name for display
 * Converts location names to their commonly used game names
 * @param location - The location name to normalize
 * @returns The normalized location name
 */
export const formatLocation = (location: string): string => {
  const normalized = location.toLowerCase().trim();
  // Only shorten "Rima City - Barracks" to "Barracks"
  if (normalized === "rima city - barracks") {
    return "Barracks";
  }
  // Return the original location name for all other cases
  return location;
};
