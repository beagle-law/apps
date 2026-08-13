export function suggestedCaseNumber(existingCaseCount: number): string {
  const year = new Date().getFullYear();
  return `${year}-${String(existingCaseCount + 1).padStart(3, "0")}`;
}

export function computeCaseNumberForClient(clientNumber: number, linkedCaseCount: number): string {
  return linkedCaseCount === 0 ? String(clientNumber) : `${clientNumber}-${linkedCaseCount + 1}`;
}
