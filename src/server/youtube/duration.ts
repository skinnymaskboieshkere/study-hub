const ISO_DURATION = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

/**
 * YouTube's ISO-8601 duration → seconds: "PT1H2M3S" → 3723, "P1DT2H" → 93600.
 * Returns null for text that is not a duration ("", "P", "PT", "1:02").
 * Live streams and premieres report "P0D" → 0.
 */
export function iso8601ToSeconds(value: string): number | null {
  const match = ISO_DURATION.exec(value.trim());
  if (!match || value.trim() === "P" || value.trim().endsWith("T")) return null;
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * 86_400 +
    Number(hours ?? 0) * 3_600 +
    Number(minutes ?? 0) * 60 +
    Math.round(Number(seconds ?? 0))
  );
}
