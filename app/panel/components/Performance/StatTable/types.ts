export interface StatRow {
  label: string;
  value: number | string;
  format?: (value: number | string) => string;
  className?: string;
  showIfZero?: boolean;
}
