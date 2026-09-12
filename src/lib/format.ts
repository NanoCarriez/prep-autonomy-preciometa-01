const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const clpPrecise = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatClpInteger(value: number): string {
  return clp.format(value);
}

export function formatProjectedProfit(value: number): string {
  return clpPrecise.format(value);
}
