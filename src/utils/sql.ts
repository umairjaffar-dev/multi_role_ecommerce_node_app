// % and _ are wildcards in LIKE/ILIKE; escape them so a search for "50%" matches the text "50%"
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
