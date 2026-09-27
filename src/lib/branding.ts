/** Public-facing owner name for guest copy. */
export const OWNER_NAME = "Deekshith";

export function possess(name: string): string {
  return name.endsWith("s") || name.endsWith("S") ? `${name}'` : `${name}'s`;
}
