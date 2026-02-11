import { extractHslValues } from "../utils";
import { Badge } from "@app/components";
import { memo } from "react";
import type { ChartConfig } from "@app/components";

interface SkillPillsProps {
  skills: string[];
  chartConfig: ChartConfig;
}

const SkillPills = memo(({ skills, chartConfig }: SkillPillsProps) => {
  if (skills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map(skill => {
        const skillConfig = chartConfig[skill];
        const color =
          (typeof skillConfig === "object" && skillConfig && "color" in skillConfig
            ? skillConfig.color
            : "var(--primary)") || "var(--primary)";

        const hslValues = extractHslValues(color);

        return (
          <Badge
            key={skill}
            className="border text-xs font-medium shadow-sm"
            style={{
              background: `linear-gradient(135deg, hsl(${hslValues} / 0.2) 0%, hsl(${hslValues} / 0.1) 50%, hsl(${hslValues} / 0.05) 100%)`,
              color: color,
              borderColor: `hsl(${hslValues} / 0.4)`,
              boxShadow: `0 1px 2px 0 hsl(${hslValues} / 0.15)`,
            }}>
            {skill}
          </Badge>
        );
      })}
    </div>
  );
});

SkillPills.displayName = "SkillPills";

export { SkillPills };
