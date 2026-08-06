export function baht(n: number): string {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

export function toBE(gregorianYear: number): number {
  return gregorianYear + 543;
}

export function currentBEYear(): number {
  return toBE(new Date().getFullYear());
}

export function currentMonth(): number {
  return new Date().getMonth() + 1;
}
