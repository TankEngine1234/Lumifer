// Format a confidence value (0–1) as a percentage string
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// Format a number with one decimal place
export function formatDecimal(value: number): string {
  return value.toFixed(1);
}

// Capitalize first letter
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
