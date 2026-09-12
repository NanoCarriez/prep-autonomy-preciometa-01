import {
  STORAGE_KEY,
  calculateMinPrice,
  parsePricingInputs,
  type PricingResult,
} from "./pricing.ts";

export { STORAGE_KEY };

export type PersistedState = {
  version: 1;
  inputs: {
    cost: string;
    feePercent: string;
    fixedFee: string;
    targetProfit: string;
  };
  result: {
    minPriceClp: number;
    projectedProfitRaw: number;
    feeRate: number;
    minPriceRaw: number;
  };
};

export type FormFields = PersistedState["inputs"];

export const EMPTY_FIELDS: FormFields = {
  cost: "",
  feePercent: "",
  fixedFee: "",
  targetProfit: "",
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isPersistedState(value: unknown): value is PersistedState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (!v.inputs || typeof v.inputs !== "object") return false;
  if (!v.result || typeof v.result !== "object") return false;
  const inputs = v.inputs as Record<string, unknown>;
  const result = v.result as Record<string, unknown>;
  const fields = ["cost", "feePercent", "fixedFee", "targetProfit"] as const;
  for (const key of fields) {
    if (typeof inputs[key] !== "string") return false;
  }
  if (typeof result.minPriceClp !== "number" || !Number.isSafeInteger(result.minPriceClp)) {
    return false;
  }
  if (typeof result.projectedProfitRaw !== "number" || !Number.isFinite(result.projectedProfitRaw)) {
    return false;
  }
  if (typeof result.feeRate !== "number" || !Number.isFinite(result.feeRate)) {
    return false;
  }
  if (typeof result.minPriceRaw !== "number" || !Number.isFinite(result.minPriceRaw)) {
    return false;
  }

  const parsed = parsePricingInputs({
    cost: inputs.cost as string,
    feePercent: inputs.feePercent as string,
    fixedFee: inputs.fixedFee as string,
    targetProfit: inputs.targetProfit as string,
  });
  if (!parsed.ok) return false;

  const calc = calculateMinPrice(parsed.value);
  if (!calc.ok) return false;
  if (calc.value.minPriceClp !== result.minPriceClp) return false;
  if (calc.value.projectedProfitRaw !== result.projectedProfitRaw) return false;
  return true;
}

export function buildPersistedState(
  inputs: FormFields,
  result: PricingResult,
): PersistedState {
  return {
    version: 1,
    inputs: { ...inputs },
    result: {
      minPriceClp: result.minPriceClp,
      projectedProfitRaw: result.projectedProfitRaw,
      feeRate: result.feeRate,
      minPriceRaw: result.minPriceRaw,
    },
  };
}

export function saveValidState(state: PersistedState): boolean {
  if (!isPersistedState(state)) return false;
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadValidState(): PersistedState | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null || raw === "") return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedState(parsed)) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearPersistedState(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
