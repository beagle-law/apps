export function compareCaseNumbers(a: string, b: string): number {
  const aNumeric = /^\d+$/.test(a);
  const bNumeric = /^\d+$/.test(b);
  if (aNumeric && bNumeric) return parseInt(a, 10) - parseInt(b, 10);
  if (aNumeric && !bNumeric) return -1;
  if (!aNumeric && bNumeric) return 1;
  return a.localeCompare(b, "ja");
}

export function sortCasesByCaseNumber<T extends { caseNumber: string }>(cases: T[]): T[] {
  return [...cases].sort((a, b) => compareCaseNumbers(a.caseNumber, b.caseNumber));
}
