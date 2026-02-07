import type { UserStats, SkillStat } from '@extension/shared';

/**
 * Scrape user stats from the stats page
 * URL: https://www.syrnia.com/theGame/includes2/stats.php
 */
export const scrapeUserStats = (): UserStats | null => {
  try {
    // Get username from <h2 class="userName"> {username} </h2>
    const userNameElement = document.querySelector('h2.userName');
    const username = userNameElement?.textContent?.trim() || '';

    const skills: Record<string, SkillStat> = {};

    // Find the main stats table
    const statsTable = document.querySelector('table.statsTable');
    const tables = statsTable ? [statsTable] : document.querySelectorAll('table');

    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');

      rows.forEach(row => {
        // Skip header rows and summary rows
        const isHeaderRow = row.querySelector('th') !== null;
        const cells = row.querySelectorAll('td');

        // Skip if it's a header row or doesn't have enough cells for a skill row
        if (isHeaderRow || cells.length < 5) {
          return;
        }

        // Check if it's a summary row (Total, Combat)
        const secondCellText = cells[1]?.textContent?.trim() || '';
        if (secondCellText === 'Total' || secondCellText === 'Combat') {
          return;
        }

        // Extract data based on known structure:
        // Cell 0: Image (skip)
        // Cell 1: Skill name
        // Cell 2: Level
        // Cell 3: Level gained this week (in span.green)
        // Cell 4: Total exp
        // Cell 5: Next level info (progress bar + "X exp left" text)
        // Cell 6: +Hour (in span if present)
        // Cell 7: +Week (in span.green if present)

        const skillNameCell = cells[1];
        const levelCell = cells[2];
        const levelGainedCell = cells[3];
        const totalExpCell = cells[4];
        const nextLevelCell = cells[5];
        const hourExpCell = cells[6];
        const weekExpCell = cells[7];

        const skillName = skillNameCell?.textContent?.trim() || '';
        const level = levelCell?.textContent?.trim() || '';

        // Track ALL skills from the stats page (not just a hardcoded list)
        if (!skillName || !level) {
          return; // Missing required data
        }

        // Skip if we already have this skill
        if (skills[skillName]) {
          return;
        }

        // Extract total exp from cell 4
        const totalExpText = totalExpCell?.textContent?.trim() || '';
        const totalExp = totalExpText.replace(/,/g, '');

        // Extract exp left and percentage from cell 5 (next level cell)
        const nextLevelText = nextLevelCell?.textContent?.trim() || '';
        const expLeftMatch = nextLevelText.match(/([\d,]+)\s+exp\s+left/i);
        const expLeft = expLeftMatch ? expLeftMatch[1].replace(/,/g, '') : '0';

        // Get percentage from progress bar
        let percentToNext = 0;
        const progressBar = nextLevelCell?.querySelector('.completeProgress');
        if (progressBar) {
          const style = (progressBar as HTMLElement).style.width;
          const percentMatch = style?.match(/(\d+(?:\.\d+)?)%/);
          if (percentMatch) {
            percentToNext = parseFloat(percentMatch[1]) || 0;
          }
        }
        // Fallback: try to get percentage from text
        if (percentToNext === 0) {
          const percentTextMatch = nextLevelText.match(/(\d+(?:\.\d+)?)%/);
          if (percentTextMatch) {
            percentToNext = parseFloat(percentTextMatch[1]) || 0;
          }
        }

        // Extract level gained this week from cell 3
        const levelGainedSpan = levelGainedCell?.querySelector('span.green');
        const levelGainedThisWeek = levelGainedSpan?.textContent?.trim().replace(/\+/g, '') || '0';

        // Extract +Hour from cell 6
        const hourExpSpan = hourExpCell?.querySelector('span.green');
        const gainedThisHour = hourExpSpan?.textContent?.trim().replace(/\+/g, '').replace(/,/g, '') || '';

        // Extract +Week from cell 7
        const weekExpSpan = weekExpCell?.querySelector('span.green');
        const gainedThisWeek = weekExpSpan?.textContent?.trim().replace(/\+/g, '').replace(/,/g, '') || '';

        skills[skillName] = {
          skill: skillName,
          level: level || '0',
          totalExp: totalExp || '0',
          expForNextLevel: expLeft || '0',
          percentToNext,
          expLeft: expLeft || '0',
          gainedThisHour: gainedThisHour || undefined,
          gainedThisWeek: gainedThisWeek || undefined,
          levelGainedThisWeek: levelGainedThisWeek || undefined,
        };
      });
    });

    if (Object.keys(skills).length === 0) {
      return null;
    }

    // If we found skills but no username, use a default or try to extract from page
    let finalUsername = username;
    if (!finalUsername) {
      // Try to get username from page title or other elements
      const pageTitle = document.title;
      if (pageTitle && !pageTitle.includes('Sessions')) {
        finalUsername = pageTitle;
      } else {
        finalUsername = 'Player'; // Default fallback
      }
    }

    return {
      username: finalUsername,
      timestamp: new Date().toISOString(),
      skills,
    };
  } catch {
    return null;
  }
};
