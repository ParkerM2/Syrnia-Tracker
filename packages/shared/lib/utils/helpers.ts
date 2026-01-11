import { SKILLS_ARRAY } from '../../const.js';
import type { ExcludeValuesFromBaseArrayType } from './types.js';

export const excludeValuesFromBaseArray = <B extends string[], E extends (string | number)[]>(
  baseArray: B,
  excludeArray: E,
) => baseArray.filter(value => !excludeArray.includes(value)) as ExcludeValuesFromBaseArrayType<B, E>;

export const sleep = async (time: number) => new Promise(r => setTimeout(r, time));

export const skillExpRegex = (skill: string) => {
  const regex = new RegExp(`${skill} level: (\\d+) \\((\\d+) exp, (\\d+) for next level\\)`);
  return regex;
};

export interface SkillInfo {
  skill: string;
  exp: string;
  level: string;
  expForNextLevel: string;
}

export const matchText = (text: string): SkillInfo => {
  const result: SkillInfo = { skill: '', exp: '', level: '', expForNextLevel: '' };
  const skillList = SKILLS_ARRAY.filter((item: string) => text.includes(item));

  skillList?.forEach((item: string) => {
    const expRegex = skillExpRegex(item);
    const expMatch = text.match(expRegex);
    if (expMatch && expMatch[1] && expMatch[2] && expMatch[3]) {
      result.level = expMatch[1];
      result.exp = expMatch[2];
      result.expForNextLevel = expMatch[3];
      result.skill = item;
    }
  });

  return result;
};
