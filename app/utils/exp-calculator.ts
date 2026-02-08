/**
 * Experience Calculator for Syrnia
 *
 * This utility calculates exp requirements based on level intervals.
 * Uses interpolation between known data points for accuracy.
 *
 * Data points from game:
 * - Level 10: 3,219 exp
 * - Level 20: 36,608 exp
 * - Level 40: 416,365 exp
 * - Level 60: 1,726,400 exp
 * - Level 100: 10,358,819 exp
 * - Level 200: 117,820,168 exp
 */

// Known data points: [level, totalExp]
const EXP_DATA_POINTS: Array<[number, number]> = [
  [1, 0], // Level 1 requires 0 exp
  [10, 3219],
  [20, 36608],
  [40, 416365],
  [60, 1726400],
  [100, 10358819],
  [200, 117820168],
];

/**
 * Interpolate exp for a given level using known data points
 * Uses linear interpolation between the two closest data points
 */
const interpolateExp = (level: number): number => {
  // Find the two closest data points
  let lower: [number, number] | null = null;
  let upper: [number, number] | null = null;

  for (let i = 0; i < EXP_DATA_POINTS.length; i++) {
    const [dataLevel] = EXP_DATA_POINTS[i];
    if (dataLevel <= level) {
      lower = EXP_DATA_POINTS[i];
    }
    if (dataLevel >= level && !upper) {
      upper = EXP_DATA_POINTS[i];
      break;
    }
  }

  // If level is below first data point, return 0
  if (!lower) return 0;

  // If level is at or above last data point, extrapolate
  if (!upper) {
    const [lastLevel, lastExp] = EXP_DATA_POINTS[EXP_DATA_POINTS.length - 1];
    const [secondLastLevel, secondLastExp] = EXP_DATA_POINTS[EXP_DATA_POINTS.length - 2];

    // Extrapolate using the rate of change from the last two points
    const levelDiff = lastLevel - secondLastLevel;
    const expDiff = lastExp - secondLastExp;
    const expPerLevel = expDiff / levelDiff;

    const levelsBeyond = level - lastLevel;
    return lastExp + levelsBeyond * expPerLevel;
  }

  // If level matches a data point exactly, return that value
  if (lower[0] === upper[0]) return lower[1];

  // Linear interpolation between lower and upper
  const [lowerLevel, lowerExp] = lower;
  const [upperLevel, upperExp] = upper;
  const ratio = (level - lowerLevel) / (upperLevel - lowerLevel);

  return lowerExp + (upperExp - lowerExp) * ratio;
};

/**
 * Calculate total exp required to reach a specific level
 * Uses interpolation between known data points for accuracy
 */
export const calculateTotalExpForLevel = (level: number): number => {
  if (level <= 0) return 0;
  if (level === 1) return 0; // Level 1 requires 0 exp (starting level)

  return Math.floor(interpolateExp(level));
};

/**
 * Calculate exp required to go from current level to next level
 * This is the expForNextLevel value
 */
export const calculateExpForNextLevel = (currentLevel: number): number => {
  if (currentLevel <= 0) return 0;

  const totalExpForCurrentLevel = calculateTotalExpForLevel(currentLevel);
  const totalExpForNextLevel = calculateTotalExpForLevel(currentLevel + 1);

  return totalExpForNextLevel - totalExpForCurrentLevel;
};

/**
 * Calculate progress percentage (0-100) to next level
 * @param currentLevel - Current skill level
 * @param currentTotalExp - Total exp accumulated so far
 * @returns Progress percentage (0-100)
 */
export const calculatePercentToNext = (currentLevel: number, currentTotalExp: number): number => {
  if (currentLevel <= 0) return 0;

  const totalExpForCurrentLevel = calculateTotalExpForLevel(currentLevel);
  const totalExpForNextLevel = calculateTotalExpForLevel(currentLevel + 1);
  const expForNextLevel = totalExpForNextLevel - totalExpForCurrentLevel;

  if (expForNextLevel <= 0) return 100; // Already max level or invalid

  const expAtCurrentLevel = currentTotalExp - totalExpForCurrentLevel;
  const progress = (expAtCurrentLevel / expForNextLevel) * 100;

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, progress));
};

/**
 * Calculate exp left until next level
 * @param currentLevel - Current skill level
 * @param currentTotalExp - Total exp accumulated so far
 * @returns Exp remaining until next level
 */
export const calculateExpLeft = (currentLevel: number, currentTotalExp: number): number => {
  if (currentLevel <= 0) return 0;

  const totalExpForCurrentLevel = calculateTotalExpForLevel(currentLevel);
  const totalExpForNextLevel = calculateTotalExpForLevel(currentLevel + 1);
  const expForNextLevel = totalExpForNextLevel - totalExpForCurrentLevel;

  if (expForNextLevel <= 0) return 0; // Already max level or invalid

  const expAtCurrentLevel = currentTotalExp - totalExpForCurrentLevel;
  const expLeft = expForNextLevel - expAtCurrentLevel;

  return Math.max(0, expLeft);
};

/**
 * Determine level from total exp
 * This is useful when we only have total exp but need to know the level
 */
export const calculateLevelFromTotalExp = (totalExp: number): number => {
  if (totalExp <= 0) return 1;

  let level = 1;
  while (calculateTotalExpForLevel(level + 1) <= totalExp) {
    level++;
    // Safety check to prevent infinite loops
    if (level > 1000) break;
  }

  return level;
};

/**
 * Get the known data points used for interpolation
 * Useful for debugging or displaying formula information
 */
export const getExpDataPoints = (): Array<[number, number]> => [...EXP_DATA_POINTS];
