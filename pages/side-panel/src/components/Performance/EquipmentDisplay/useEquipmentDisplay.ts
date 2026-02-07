import { useMemo } from 'react';
import type { EquipmentItem } from '@extension/shared';

interface FormattedEquipmentItem {
  slot: string;
  name: string;
  imageUrl: string;
}

interface EquipmentDisplayData {
  items?: Record<string, EquipmentItem>;
  totals?: {
    armour?: number;
    aim?: number;
    power?: number;
    travelTime?: number;
  };
}

/**
 * Hook for formatting and organizing equipment data for display
 */
export const useEquipmentDisplay = (equipment: EquipmentDisplayData | undefined) => {
  // Format image URL like loot images: https://www.syrnia.com/images/inventory/Item%20Name.png?query
  const formatImageUrl = (imageUrl: string | undefined): string => {
    if (!imageUrl) return '';

    if (imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // If it's a relative path, format it properly
    if (imageUrl.startsWith('images/')) {
      // Extract the path and query parameters
      const [path, query] = imageUrl.split('?');
      // URL encode spaces in the path (like loot images)
      const encodedPath = path.replace(/\s/g, '%20');
      // Reconstruct with query params if they exist
      return `https://www.syrnia.com/${encodedPath}${query ? `?${query}` : ''}`;
    }

    // Fallback: prepend base URL
    return `https://www.syrnia.com/${imageUrl}`;
  };

  // Organize equipment items into rows for the grid layout
  const equipmentRows = useMemo(() => {
    const emptyRows = {
      row1: [],
      row2: [],
      row3: [],
      row4: [],
      row2Map: {
        shield: undefined,
        body: undefined,
        weapon: undefined,
      },
      row3Map: {
        legs: undefined,
        gloves: undefined,
      },
      row4Map: {
        boots: undefined,
        horse: undefined,
      },
    };

    if (!equipment?.items) {
      return emptyRows;
    }

    const items = equipment.items;

    // Row 1: centered helmet
    const row1: FormattedEquipmentItem[] = [];
    if (items.helm) {
      row1.push({
        slot: 'helm',
        name: items.helm.name || 'Helm',
        imageUrl: formatImageUrl(items.helm.imageUrl),
      });
    }

    // Row 2: shield, centered chest/plate, weapon
    const row2: FormattedEquipmentItem[] = [];
    if (items.shield) {
      row2.push({
        slot: 'shield',
        name: items.shield.name || 'Shield',
        imageUrl: formatImageUrl(items.shield.imageUrl),
      });
    }
    if (items.body) {
      row2.push({
        slot: 'body',
        name: items.body.name || 'Body',
        imageUrl: formatImageUrl(items.body.imageUrl),
      });
    }
    if (items.weapon) {
      row2.push({
        slot: 'weapon',
        name: items.weapon.name || 'Weapon',
        imageUrl: formatImageUrl(items.weapon.imageUrl),
      });
    }

    // Row 3: centered legs, gloves/hands
    const row3: FormattedEquipmentItem[] = [];
    if (items.legs) {
      row3.push({
        slot: 'legs',
        name: items.legs.name || 'Legs',
        imageUrl: formatImageUrl(items.legs.imageUrl),
      });
    }
    if (items.gloves) {
      row3.push({
        slot: 'gloves',
        name: items.gloves.name || 'Gloves',
        imageUrl: formatImageUrl(items.gloves.imageUrl),
      });
    }

    // Row 4: horse, centered boots/shoes/feet
    const row4: FormattedEquipmentItem[] = [];
    if (items.horse) {
      row4.push({
        slot: 'horse',
        name: items.horse.name || 'Horse',
        imageUrl: formatImageUrl(items.horse.imageUrl),
      });
    }
    if (items.boots) {
      row4.push({
        slot: 'boots',
        name: items.boots.name || 'Boots',
        imageUrl: formatImageUrl(items.boots.imageUrl),
      });
    }

    // Create lookup maps for easy access without repeated .find() calls
    const row2Map = {
      shield: row2.find(item => item.slot === 'shield'),
      body: row2.find(item => item.slot === 'body'),
      weapon: row2.find(item => item.slot === 'weapon'),
    };

    const row3Map = {
      legs: row3.find(item => item.slot === 'legs'),
      gloves: row3.find(item => item.slot === 'gloves'),
    };

    const row4Map = {
      boots: row4.find(item => item.slot === 'boots'),
      horse: row4.find(item => item.slot === 'horse'),
    };

    return {
      row1,
      row2,
      row3,
      row4,
      row2Map,
      row3Map,
      row4Map,
    };
  }, [equipment]);

  // Format totals for display with enchant values
  const formattedTotals = useMemo(() => {
    if (!equipment || !equipment.totals || !equipment.items) {
      return null;
    }

    const totals: Array<{
      label: string;
      value: number;
      enchant?: string;
      enchantType?: 'aim' | 'armour' | 'power';
      enchantColorClass: string;
    }> = [];

    // Extract and sum enchant values by type from equipment items
    let totalArmourEnchant = 0;
    let totalAimEnchant = 0;
    let totalPowerEnchant = 0;

    Object.values(equipment.items).forEach(item => {
      if (item?.enchant) {
        const enchant = item.enchant;
        // Parse enchant like "4 Aim", "4 Power", "4 Armour"
        const aimMatch = enchant.match(/(\d+)\s+Aim/i);
        const powerMatch = enchant.match(/(\d+)\s+Power/i);
        const armourMatch = enchant.match(/(\d+)\s+Armour/i);

        if (aimMatch) {
          totalAimEnchant += parseInt(aimMatch[1], 10);
        }
        if (powerMatch) {
          totalPowerEnchant += parseInt(powerMatch[1], 10);
        }
        if (armourMatch) {
          totalArmourEnchant += parseInt(armourMatch[1], 10);
        }
      }
    });

    if (equipment.totals.armour !== undefined) {
      totals.push({
        label: 'Total Armour',
        value: Math.round(equipment.totals.armour),
        enchant: totalArmourEnchant > 0 ? `+${totalArmourEnchant} Armour` : undefined,
        enchantType: 'armour',
        enchantColorClass: totalArmourEnchant > 0 ? 'text-blue-500' : '',
      });
    }
    if (equipment.totals.aim !== undefined) {
      totals.push({
        label: 'Aim',
        value: Math.round(equipment.totals.aim),
        enchant: totalAimEnchant > 0 ? `+${totalAimEnchant} Aim` : undefined,
        enchantType: 'aim',
        enchantColorClass: totalAimEnchant > 0 ? 'text-[#f8ef8c]' : '',
      });
    }
    if (equipment.totals.power !== undefined) {
      totals.push({
        label: 'Power',
        value: Math.round(equipment.totals.power),
        enchant: totalPowerEnchant > 0 ? `+${totalPowerEnchant} Power` : undefined,
        enchantType: 'power',
        enchantColorClass: totalPowerEnchant > 0 ? 'text-red-500' : '',
      });
    }

    return totals;
  }, [equipment]);

  return {
    equipmentRows,
    formattedTotals,
  };
};
