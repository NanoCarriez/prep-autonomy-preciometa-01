import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FIXTURE,
  calculateMinPrice,
  parseClpInteger,
  parseFeePercent,
  parsePricingInputs,
} from "./pricing.ts";

describe("contrato matemático PrecioMeta", () => {
  it("fixture COST=10000 FEE=3.5 FIXED=500 PROFIT=5000 → MIN_PRICE_CLP=16063", () => {
    const result = calculateMinPrice({
      cost: FIXTURE.cost,
      feePercent: FIXTURE.feePercent,
      fixedFee: FIXTURE.fixedFee,
      targetProfit: FIXTURE.targetProfit,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.minPriceClp, 16063);
  });

  it("utilidad proyectada de la fixture es >= 5000 y < 5001", () => {
    const result = calculateMinPrice({
      cost: FIXTURE.cost,
      feePercent: FIXTURE.feePercent,
      fixedFee: FIXTURE.fixedFee,
      targetProfit: FIXTURE.targetProfit,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(result.value.projectedProfitRaw >= 5000);
    assert.ok(result.value.projectedProfitRaw < 5001);
  });

  it("reproduce la fórmula paso a paso de la fixture", () => {
    const feeRate = 3.5 / 100;
    const minPriceRaw = (10000 + 500 + 5000) / (1 - feeRate);
    const minPriceClp = Math.ceil(minPriceRaw);
    const projected = minPriceClp - 10000 - 500 - minPriceClp * feeRate;
    assert.equal(minPriceClp, 16063);
    assert.ok(projected >= 5000 && projected < 5001);
  });
});

describe("comisión 0% válida", () => {
  it("calcula ceil(costo + cargo + utilidad) cuando la comisión es 0", () => {
    const result = calculateMinPrice({
      cost: 10000,
      feePercent: 0,
      fixedFee: 500,
      targetProfit: 5000,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.minPriceClp, 15500);
    assert.equal(result.value.feeRate, 0);
    assert.equal(result.value.projectedProfitRaw, 5000);
  });

  it("parseFeePercent acepta 0 y 0.0", () => {
    assert.deepEqual(parseFeePercent("0"), { ok: true, value: 0 });
    assert.deepEqual(parseFeePercent("0.0"), { ok: true, value: 0 });
  });
});

describe("comisión 100% inválida", () => {
  it("parseFeePercent rechaza 100", () => {
    const parsed = parseFeePercent("100");
    assert.equal(parsed.ok, false);
  });

  it("parseFeePercent rechaza 100.0 y valores mayores", () => {
    assert.equal(parseFeePercent("100.0").ok, false);
    assert.equal(parseFeePercent("150").ok, false);
  });

  it("calculateMinPrice rechaza feePercent 100", () => {
    const result = calculateMinPrice({
      cost: 10000,
      feePercent: 100,
      fixedFee: 500,
      targetProfit: 5000,
    });
    assert.equal(result.ok, false);
  });
});

describe("negativos inválidos", () => {
  it("rechaza costo, cargo fijo y utilidad negativos", () => {
    assert.equal(parseClpInteger("-1").ok, false);
    assert.equal(parseClpInteger("-10000").ok, false);
    assert.equal(
      calculateMinPrice({
        cost: -1,
        feePercent: 3.5,
        fixedFee: 500,
        targetProfit: 5000,
      }).ok,
      false,
    );
    assert.equal(
      calculateMinPrice({
        cost: 10000,
        feePercent: 3.5,
        fixedFee: -500,
        targetProfit: 5000,
      }).ok,
      false,
    );
    assert.equal(
      calculateMinPrice({
        cost: 10000,
        feePercent: 3.5,
        fixedFee: 500,
        targetProfit: -1,
      }).ok,
      false,
    );
  });

  it("rechaza comisión negativa", () => {
    assert.equal(parseFeePercent("-0.1").ok, false);
    assert.equal(parseFeePercent("-3.5").ok, false);
    assert.equal(
      calculateMinPrice({
        cost: 10000,
        feePercent: -1,
        fixedFee: 500,
        targetProfit: 5000,
      }).ok,
      false,
    );
  });
});

describe("vacío / no numérico / Infinity seguros", () => {
  it("campos vacíos fallan", () => {
    assert.equal(parseClpInteger("").ok, false);
    assert.equal(parseClpInteger("   ").ok, false);
    assert.equal(parseFeePercent("").ok, false);
    const allEmpty = parsePricingInputs({
      cost: "",
      feePercent: "",
      fixedFee: "",
      targetProfit: "",
    });
    assert.equal(allEmpty.ok, false);
    assert.ok(allEmpty.fieldErrors.cost);
    assert.ok(allEmpty.fieldErrors.feePercent);
    assert.ok(allEmpty.fieldErrors.fixedFee);
    assert.ok(allEmpty.fieldErrors.targetProfit);
  });

  it("NaN, texto e Infinity fallan de forma segura", () => {
    assert.equal(parseClpInteger("NaN").ok, false);
    assert.equal(parseClpInteger("abc").ok, false);
    assert.equal(parseClpInteger("Infinity").ok, false);
    assert.equal(parseClpInteger("-Infinity").ok, false);
    assert.equal(parseFeePercent("NaN").ok, false);
    assert.equal(parseFeePercent("Infinity").ok, false);
    assert.equal(parseFeePercent("foo").ok, false);
    assert.equal(parseClpInteger("10.5").ok, false);
    assert.equal(parseClpInteger("1e4").ok, false);
  });

  it("calculateMinPrice no lanza con valores no finitos", () => {
    assert.doesNotThrow(() => {
      const r = calculateMinPrice({
        cost: Number.POSITIVE_INFINITY,
        feePercent: 3.5,
        fixedFee: 500,
        targetProfit: 5000,
      });
      assert.equal(r.ok, false);
    });
    assert.doesNotThrow(() => {
      const r = calculateMinPrice({
        cost: Number.NaN,
        feePercent: 3.5,
        fixedFee: 500,
        targetProfit: 5000,
      });
      assert.equal(r.ok, false);
    });
  });
});
