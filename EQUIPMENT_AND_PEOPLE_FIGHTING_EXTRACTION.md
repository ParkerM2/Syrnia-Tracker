# Equipment Data and People Fighting Extraction Guide

This document describes the correct way to extract equipment data and `peopleFighting` information from the game page.

## Table of Contents
- [Equipment Data Extraction](#equipment-data-extraction)
- [People Fighting Extraction](#people-fighting-extraction)
- [Data Structures](#data-structures)
- [Important Notes](#important-notes)

---

## Equipment Data Extraction

### Overview
Equipment data is extracted from the `#wearDisplayTD` element, which contains all equipped items. Each equipment slot has a unique ID that maps to a slot name.

### Implementation

#### 1. Find the Equipment Container
```typescript
const wearDisplayTD = document.querySelector('#wearDisplayTD') as HTMLElement | null;
if (!wearDisplayTD) {
  return undefined; // Equipment data not available
}
```

#### 2. Slot Mapping
The following slot IDs map to equipment slot names:

| Element ID | Slot Name | Description |
|------------|-----------|-------------|
| `displayHelm` | `helm` | Helmet slot |
| `displayShield` | `shield` | Shield slot |
| `displayBody` | `body` | Body/chest armor slot |
| `displayHand` | `weapon` | Weapon slot |
| `displayLegs` | `legs` | Leg armor slot |
| `displayGloves` | `gloves` | Gloves slot |
| `displayShoes` | `boots` | Boots slot |
| `displayHorse` | `horse` | Horse slot |
| `displayTrophy` | `trophy` | Trophy slot |

#### 3. Extract Equipment Item Data

For each slot, extract the following information:

```typescript
const slotMap: Record<string, keyof EquipmentData> = {
  displayHelm: 'helm',
  displayShield: 'shield',
  displayBody: 'body',
  displayHand: 'weapon',
  displayLegs: 'legs',
  displayGloves: 'gloves',
  displayShoes: 'boots',
  displayHorse: 'horse',
  displayTrophy: 'trophy',
};

Object.entries(slotMap).forEach(([id, slot]) => {
  const element = wearDisplayTD.querySelector(`#${id}`) as HTMLElement | null;
  if (!element) return; // Slot is empty or element not found
```

##### a. Extract Image URL
The image URL is stored in the element's `style` attribute as a CSS `url()` value:

```typescript
const style = element.getAttribute('style') || '';
const urlMatch = style.match(/url\(["']?([^"')]+)["']?\)/);
const imageUrl = urlMatch && urlMatch[1] ? urlMatch[1] : undefined;
```

##### b. Extract Title (Item Name and Enchant/Stats)
The `title` attribute contains the item name and optional enchant/stats information:

```typescript
const title = element.getAttribute('title') || '';
// Format: "Dragon helm [4 Aim]" or "Novariet scimitar [0 Durability]"
```

**Title Format:** `"Item Name [Enchant/Stats]"`

Parse the title:
```typescript
const titleMatch = title.match(/^(.+?)(?:\s+\[(.+?)\])?$/);
let name = title;
let enchant: string | undefined;
let stats: string | undefined;

if (titleMatch) {
  name = titleMatch[1].trim();
  if (titleMatch[2]) {
    const bracketContent = titleMatch[2];
    // Check if it's an enchant (contains "Aim", "Power", "Armour", "Travel Time")
    if (/\d+\s+(?:Aim|Power|Armour|Travel\s+Time)/i.test(bracketContent)) {
      enchant = bracketContent; // e.g., "4 Aim", "2 Power", "10 Armour"
    } else {
      stats = bracketContent; // e.g., "0 Durability"
    }
  }
}
```

##### c. Extract Text Content (Stats Numbers)
The `textContent` property contains numeric stats displayed in the cell:

```typescript
const textContent = element.textContent?.trim() || '';
// Format: "40" or "167/160" (numbers before image)

if (textContent) {
  // Extract numbers and slashes (for durability like "167/160")
  const statsMatch = textContent.match(/^([\d/]+)/);
  if (statsMatch && statsMatch[1]) {
    stats = statsMatch[1].trim();
  } else {
    // Fallback: extract all numbers and slashes
    const cleanStats = textContent.replace(/[^\d/]/g, '').trim();
    if (cleanStats) {
      stats = cleanStats;
    }
  }
}
```

##### d. Build Equipment Item Object
```typescript
const item: EquipmentItem = {
  slot: slot as string,
  name,
  title,
  imageUrl,
};

if (stats) item.stats = stats;
if (enchant) item.enchant = enchant;

equipment[slot] = item;
```

#### 4. Calculate Equipment Totals

Equipment totals (Armour, Aim, Power, Travel Time) can be found in two ways:

##### Method 1: Extract from Page Body Text (Preferred)
Search the entire page body text for total values:

```typescript
const bodyText = document.body.textContent || '';

// Look for patterns like "Total Armour: 123" or "Armour: 123" or "Armour 123"
const armourMatch = bodyText.match(/(?:total\s+)?armour[:\s]+(\d+)/i);
if (armourMatch) {
  equipment.totals.armour = parseInt(armourMatch[1], 10);
}

const aimMatch = bodyText.match(/(?:total\s+)?aim[:\s]+(\d+)/i);
if (aimMatch) {
  equipment.totals.aim = parseInt(aimMatch[1], 10);
}

const powerMatch = bodyText.match(/(?:total\s+)?power[:\s]+(\d+)/i);
if (powerMatch) {
  equipment.totals.power = parseInt(powerMatch[1], 10);
}

const travelTimeMatch = bodyText.match(/(?:total\s+)?travel\s+time[:\s]+(\d+)/i);
if (travelTimeMatch) {
  equipment.totals.travelTime = parseInt(travelTimeMatch[1], 10);
}
```

##### Method 2: Calculate from Equipment Enchants (Fallback)
If totals are not found in page text, sum up values from individual equipment enchants:

```typescript
let totalAim = 0;
let totalPower = 0;
let totalArmour = 0;
let totalTravelTime = 0;

Object.values(equipment).forEach(item => {
  if (item && typeof item === 'object' && 'enchant' in item && item.enchant) {
    const enchant = item.enchant;
    const aimMatch = enchant.match(/(\d+)\s+Aim/i);
    const powerMatch = enchant.match(/(\d+)\s+Power/i);
    const armourMatch = enchant.match(/(\d+)\s+Armour/i);
    const travelTimeMatch = enchant.match(/(\d+)\s+Travel\s+Time/i);

    if (aimMatch) totalAim += parseInt(aimMatch[1], 10);
    if (powerMatch) totalPower += parseInt(powerMatch[1], 10);
    if (armourMatch) totalArmour += parseInt(armourMatch[1], 10);
    if (travelTimeMatch) totalTravelTime += parseInt(travelTimeMatch[1], 10);
  }
});

// Use calculated totals if not found in page text
if (!equipment.totals.aim && totalAim > 0) equipment.totals.aim = totalAim;
if (!equipment.totals.power && totalPower > 0) equipment.totals.power = totalPower;
if (!equipment.totals.armour && totalArmour > 0) equipment.totals.armour = totalArmour;
if (!equipment.totals.travelTime && totalTravelTime > 0) equipment.totals.travelTime = totalTravelTime;
```

### When to Extract Equipment
**Important:** Equipment data should only be extracted when a fight has just finished (when skill level info is present in the fight log). This prevents unnecessary processing and ensures equipment data is captured at the right moment.

---

## People Fighting Extraction

### Overview
The `peopleFighting` value represents the number of people currently fighting at the location. It is extracted from text that follows the pattern: "There are X people fighting here".

### Implementation

#### 1. Find Source Elements
Check two potential locations for the people fighting text:

```typescript
const locationElement = document.body.querySelector('#LocationContent') as HTMLElement | null;
const fightLogElement = document.body.querySelector('#fightLogTop')?.nextElementSibling as HTMLElement | null;
```

#### 2. Extract from LocationContent Element (Primary)
```typescript
if (locationElement) {
  const locationText = locationElement.textContent || '';
  const peopleMatch = locationText.match(/there\s+are\s+(\d+)\s+people\s+fighting\s+here/i);
  if (peopleMatch && peopleMatch[1]) {
    const count = parseInt(peopleMatch[1], 10);
    if (!isNaN(count)) {
      return count;
    }
  }
}
```

#### 3. Extract from Fight Log Element (Fallback)
```typescript
if (fightLogElement) {
  const fightText = fightLogElement.textContent || '';
  const peopleMatch = fightText.match(/there\s+are\s+(\d+)\s+people\s+fighting\s+here/i);
  if (peopleMatch && peopleMatch[1]) {
    const count = parseInt(peopleMatch[1], 10);
    if (!isNaN(count)) {
      return count;
    }
  }
}
```

#### 4. Return Result
```typescript
return null; // Return null if not found
```

### Regex Pattern
The regex pattern used is case-insensitive and matches:
- "There are 5 people fighting here"
- "there are 10 people fighting here"
- "THERE ARE 3 PEOPLE FIGHTING HERE"

Pattern: `/there\s+are\s+(\d+)\s+people\s+fighting\s+here/i`

### When to Extract People Fighting
People fighting can be extracted at any time (not just at fight end), as it represents the current state of the location.

---

## Data Structures

### EquipmentData Interface
```typescript
interface EquipmentData {
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
```

### EquipmentItem Interface
```typescript
interface EquipmentItem {
  slot: string;
  name: string;
  title: string;
  imageUrl?: string;
  stats?: string; // e.g., "167/160" for durability
  enchant?: string; // e.g., "4 Aim", "2 Power", "10 Armour"
}
```

### ScreenData Interface (Relevant Fields)
```typescript
interface ScreenData {
  // ... other fields
  peopleFighting?: number | null; // Number of people fighting at the location
  equipment?: EquipmentData; // Equipment worn at fight end
}
```

---

## Important Notes

### Equipment Extraction
1. **Timing:** Equipment should only be extracted when a fight has just finished (when skill level info is present in the fight log).
2. **Empty Slots:** If an equipment slot is empty, the element may not exist. Always check for element existence before extracting.
3. **Image URLs:** Image URLs are extracted from CSS `url()` values in the `style` attribute.
4. **Title Parsing:** The title attribute contains both the item name and optional enchant/stats in brackets.
5. **Stats vs Enchants:** 
   - Enchants contain "Aim", "Power", "Armour", or "Travel Time" (e.g., "4 Aim")
   - Stats are other values like durability (e.g., "0 Durability")
6. **Totals Calculation:** Always try to extract totals from page text first, then fall back to calculating from individual equipment enchants.

### People Fighting Extraction
1. **Multiple Sources:** Check both `#LocationContent` and the fight log element for maximum reliability.
2. **Case Insensitive:** The regex pattern is case-insensitive to handle variations in text casing.
3. **Null Handling:** Return `null` if the text is not found (not `0` or `undefined`).
4. **Real-time Value:** This value can change at any time and represents the current state of the location.

### Error Handling
- Always check for element existence before accessing properties
- Use optional chaining and nullish coalescing where appropriate
- Return `undefined` or `null` when data is not available (don't throw errors)
- Validate parsed numbers with `isNaN()` checks

### Performance Considerations
- Equipment extraction is only performed at fight end to minimize processing
- People fighting extraction is lightweight and can be done more frequently
- Both operations use efficient DOM queries and regex matching

---

## Example Usage

```typescript
// Extract equipment (only at fight end)
if (hasSkillLevelInfo) {
  const equipment = parseEquipment();
  // equipment will be EquipmentData | undefined
}

// Extract people fighting (anytime)
const locationElement = document.body.querySelector('#LocationContent') as HTMLElement | null;
const fightLogElement = document.body.querySelector('#fightLogTop')?.nextElementSibling as HTMLElement | null;
const peopleFighting = parsePeopleFighting(locationElement, fightLogElement);
// peopleFighting will be number | null
```

---

## References

- Source file: `Chrome-Ext/pages/content/src/scrapeScreenData.ts`
- Type definitions: `Chrome-Ext/packages/shared/lib/utils/types.ts`
- CSV tracking: `Chrome-Ext/packages/shared/lib/utils/csv-tracker.ts`
