export const VISIBLE_MARKER = "PREP_AUTONOMY_PRECIOMETA_01";
export const STORAGE_KEY = "prep_autonomy_preciometa_01_state";

export type PricingInputs = {
  cost: number;
  feePercent: number;
  fixedFee: number;
  targetProfit: number;
};

export type PricingResult = {
  feeRate: number;
  minPriceRaw: number;
  minPriceClp: number;
  projectedProfitRaw: number;
};

export type ParseOk<T> = { ok: true; value: T };
export type ParseErr = { ok: false; error: string };
export type ParseResult<T> = ParseOk<T> | ParseErr;

export const EMPTY_FIELD = "Completa este campo.";
export const INVALID_CLP =
  "Ingresa un entero finito mayor o igual a 0, sin decimales ni símbolos.";
export const INVALID_FEE =
  "Ingresa una comisión mayor o igual a 0 y menor que 100. Usa 3.5 para 3,5%.";
export const FEE_TOO_HIGH =
  "La comisión debe ser menor que 100%. Con 100% o más no se puede calcular un precio.";
export const CALC_UNSAFE = "No se puede calcular un precio con estos valores.";

const CLP_INTEGER = /^\d+$/;
const FEE_NUMBER = /^\d+([.,]\d+)?$/;

export function parseClpInteger(raw: string): ParseResult<number> {
  if (typeof raw !== "string") return { ok: false, error: INVALID_CLP };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, error: EMPTY_FIELD };
  if (!CLP_INTEGER.test(trimmed)) return { ok: false, error: INVALID_CLP };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || !Number.isSafeInteger(value) || value < 0) {
    return { ok: false, error: INVALID_CLP };
  }
  return { ok: true, value };
}

export function parseFeePercent(raw: string): ParseResult<number> {
  if (typeof raw !== "string") return { ok: false, error: INVALID_FEE };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, error: EMPTY_FIELD };
  if (!FEE_NUMBER.test(trimmed)) return { ok: false, error: INVALID_FEE };
  const normalized = trimmed.replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, error: INVALID_FEE };
  }
  if (value >= 100) return { ok: false, error: FEE_TOO_HIGH };
  return { ok: true, value };
}

export function parsePricingInputs(raw: {
  cost: string;
  feePercent: string;
  fixedFee: string;
  targetProfit: string;
}): ParseResult<PricingInputs> & { fieldErrors: Record<string, string> } {
  const cost = parseClpInteger(raw.cost);
  const feePercent = parseFeePercent(raw.feePercent);
  const fixedFee = parseClpInteger(raw.fixedFee);
  const targetProfit = parseClpInteger(raw.targetProfit);

  const fieldErrors: Record<string, string> = {};
  if (!cost.ok) fieldErrors.cost = cost.error;
  if (!feePercent.ok) fieldErrors.feePercent = feePercent.error;
  if (!fixedFee.ok) fieldErrors.fixedFee = fixedFee.error;
  if (!targetProfit.ok) fieldErrors.targetProfit = targetProfit.error;

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Revisa los campos marcados.", fieldErrors };
  }

  return {
    ok: true,
    value: {
      cost: (cost as ParseOk<number>).value,
      feePercent: (feePercent as ParseOk<number>).value,
      fixedFee: (fixedFee as ParseOk<number>).value,
      targetProfit: (targetProfit as ParseOk<number>).value,
    },
    fieldErrors,
  };
}

/**
 * FEE_RATE = FEE_PERCENT / 100
 * MIN_PRICE_RAW = (COST + FIXED_FEE + TARGET_PROFIT) / (1 - FEE_RATE)
 * MIN_PRICE_CLP = ceil(MIN_PRICE_RAW)
 * PROJECTED_PROFIT_RAW = MIN_PRICE_CLP - COST - FIXED_FEE - (MIN_PRICE_CLP * FEE_RATE)
 */
export function calculateMinPrice(inputs: PricingInputs): ParseResult<PricingResult> {
  const { cost, feePercent, fixedFee, targetProfit } = inputs;

  if (
    ![cost, feePercent, fixedFee, targetProfit].every(
      (n) => typeof n === "number" && Number.isFinite(n),
    )
  ) {
    return { ok: false, error: CALC_UNSAFE };
  }
  if (!Number.isSafeInteger(cost) || cost < 0) return { ok: false, error: INVALID_CLP };
  if (!Number.isSafeInteger(fixedFee) || fixedFee < 0) {
    return { ok: false, error: INVALID_CLP };
  }
  if (!Number.isSafeInteger(targetProfit) || targetProfit < 0) {
    return { ok: false, error: INVALID_CLP };
  }
  if (feePercent < 0 || feePercent >= 100 || !Number.isFinite(feePercent)) {
    return { ok: false, error: feePercent >= 100 ? FEE_TOO_HIGH : INVALID_FEE };
  }

  const feeRate = feePercent / 100;
  const denominator = 1 - feeRate;
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return { ok: false, error: FEE_TOO_HIGH };
  }

  const minPriceRaw = (cost + fixedFee + targetProfit) / denominator;
  if (!Number.isFinite(minPriceRaw) || minPriceRaw < 0) {
    return { ok: false, error: CALC_UNSAFE };
  }

  const minPriceClp = Math.ceil(minPriceRaw);
  if (!Number.isSafeInteger(minPriceClp)) {
    return { ok: false, error: CALC_UNSAFE };
  }

  const projectedProfitRaw = minPriceClp - cost - fixedFee - minPriceClp * feeRate;
  if (!Number.isFinite(projectedProfitRaw)) {
    return { ok: false, error: CALC_UNSAFE };
  }

  return {
    ok: true,
    value: { feeRate, minPriceRaw, minPriceClp, projectedProfitRaw },
  };
}

export const FIXTURE = {
  cost: 10000,
  feePercent: 3.5,
  fixedFee: 500,
  targetProfit: 5000,
  minPriceClp: 16063,
} as const;
