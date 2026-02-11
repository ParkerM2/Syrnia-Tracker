import { useEquipmentDisplay } from "./useEquipmentDisplay";
import { memo } from "react";
import type { EquipmentItem } from "@app/types";

interface EquipmentDisplayData {
  items?: Record<string, EquipmentItem>;
  totals?: {
    armour?: number;
    aim?: number;
    power?: number;
    travelTime?: number;
  };
}

interface EquipmentDisplayProps {
  equipment: EquipmentDisplayData;
}

/**
 * Equipment Display Component
 * Displays equipment items in a grid layout:
 * Row 1: centered helmet
 * Row 2: shield, centered chest/plate, weapon
 * Row 3: centered legs, gloves/hands
 * Row 4: horse, centered boots/shoes/feet
 */
const EquipmentDisplay = memo(({ equipment }: EquipmentDisplayProps) => {
  const { equipmentRows, formattedTotals } = useEquipmentDisplay(equipment);

  return (
    <div className="flex flex-1 flex-col gap-4 pl-6 sm:border-l">
      <h3 className="text-center text-lg font-semibold">Average Equipment</h3>

      {/* Equipment Grid */}
      <div className="flex flex-col gap-1">
        {/* Row 1: Centered Helmet */}
        <div className="flex justify-center gap-1">
          {equipmentRows.row1.map(item => (
            <div key={item.slot} className="relative">
              <img src={item.imageUrl} alt={item.name} className="h-12 w-12 rounded border object-contain" />
            </div>
          ))}
        </div>

        {/* Row 2: Shield, Centered Chest/Plate, Weapon */}
        <div className="flex items-center justify-center gap-1">
          {/* Shield - Left */}
          {equipmentRows.row2Map.shield && (
            <div className="relative">
              <img
                src={equipmentRows.row2Map.shield.imageUrl}
                alt={equipmentRows.row2Map.shield.name}
                className="h-12 w-12 rounded border object-contain"
              />
            </div>
          )}

          {/* Body - Center */}
          {equipmentRows.row2Map.body && (
            <div className="relative">
              <img
                src={equipmentRows.row2Map.body.imageUrl}
                alt={equipmentRows.row2Map.body.name}
                className="h-12 w-12 rounded border object-contain"
              />
            </div>
          )}

          {/* Weapon - Right */}
          {equipmentRows.row2Map.weapon && (
            <div className="relative">
              <img
                src={equipmentRows.row2Map.weapon.imageUrl}
                alt={equipmentRows.row2Map.weapon.name}
                className="h-12 w-12 rounded border object-contain"
              />
            </div>
          )}
        </div>

        {/* Row 3: Centered Legs (under chest), Gloves/Hands */}
        <div className="flex items-center justify-center gap-1">
          {/* Spacer to align with shield position */}
          <div className="w-[52px]"></div>

          {/* Legs - Centered under body */}
          {equipmentRows.row3Map.legs && (
            <div className="relative">
              <img
                src={equipmentRows.row3Map.legs.imageUrl}
                alt={equipmentRows.row3Map.legs.name}
                className="h-12 w-12 rounded border object-contain"
              />
            </div>
          )}

          {/* Gloves - Right (aligned with weapon) */}
          {equipmentRows.row3Map.gloves && (
            <div className="relative">
              <img
                src={equipmentRows.row3Map.gloves.imageUrl}
                alt={equipmentRows.row3Map.gloves.name}
                className="h-12 w-12 rounded border object-contain"
              />
            </div>
          )}
        </div>

        {/* Row 4: Horse, Centered Boots (under legs) */}
        <div className="flex items-center justify-center gap-1">
          {/* Spacer to align with shield position (same as row 3 for legs) */}
          <div className="w-[52px]"></div>

          {/* Boots - Centered under legs (exact same position as legs) */}
          {equipmentRows.row4Map.boots && (
            <div className="relative">
              <img
                src={equipmentRows.row4Map.boots.imageUrl}
                alt={equipmentRows.row4Map.boots.name}
                className="h-12 w-12 rounded border object-contain"
              />
            </div>
          )}

          {/* Horse - Right (aligned with gloves position) */}
          {equipmentRows.row4Map.horse && (
            <div className="relative">
              <img
                src={equipmentRows.row4Map.horse.imageUrl}
                alt={equipmentRows.row4Map.horse.name}
                className="h-12 w-12 rounded border object-contain"
              />
            </div>
          )}
        </div>
      </div>

      {/* Equipment Stats Totals */}
      {formattedTotals && formattedTotals.length > 0 && (
        <div className="flex w-full flex-col gap-2">
          {formattedTotals.map(total => (
            <div key={total.label}>
              <div className="justitfy-between flex flex-row items-center">
                <p className="flex-1 text-left text-sm text-muted-foreground">{total.label}</p>

                <div className="justitfy-between flex flex-row items-center">
                  <p className="flex-1 text-right font-semibold">{total.value}</p>
                  {total.enchant ? (
                    <p className={`min-w-16 flex-1 text-right text-xs font-medium ${total.enchantColorClass}`}>
                      {total.enchant}
                    </p>
                  ) : (
                    <p className="min-w-16 flex-1"></p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

EquipmentDisplay.displayName = "EquipmentDisplay";

export { EquipmentDisplay };
