import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  buildPersistedState,
  clearPersistedState,
  isPersistedState,
  loadValidState,
  saveValidState,
} from "./persist.ts";
import { calculateMinPrice } from "./pricing.ts";

class MemoryStorage implements Storage {
  #map = new Map<string, string>();
  get length() {
    return this.#map.size;
  }
  clear() {
    this.#map.clear();
  }
  getItem(key: string) {
    return this.#map.has(key) ? this.#map.get(key)! : null;
  }
  key(index: number) {
    return [...this.#map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.#map.delete(key);
  }
  setItem(key: string, value: string) {
    this.#map.set(key, String(value));
  }
}

const fixtureInputs = {
  cost: "10000",
  feePercent: "3.5",
  fixedFee: "500",
  targetProfit: "5000",
};

function fixtureState() {
  const calc = calculateMinPrice({
    cost: 10000,
    feePercent: 3.5,
    fixedFee: 500,
    targetProfit: 5000,
  });
  if (!calc.ok) throw new Error("fixture calc failed");
  return buildPersistedState(fixtureInputs, calc.value);
}

describe("persistencia del último estado válido", () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    (globalThis as { window?: unknown }).window = { localStorage: storage };
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("guarda y restaura el estado válido de la fixture", () => {
    const state = fixtureState();
    assert.equal(saveValidState(state), true);
    const loaded = loadValidState();
    assert.deepEqual(loaded, state);
    assert.equal(loaded?.result.minPriceClp, 16063);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    assert.ok(raw && raw.includes("16063"));
  });

  it("usa exactamente la key prep_autonomy_preciometa_01_state", () => {
    assert.equal(STORAGE_KEY, "prep_autonomy_preciometa_01_state");
    saveValidState(fixtureState());
    assert.equal(window.localStorage.getItem("prep_autonomy_preciometa_01_state") == null, false);
  });

  it("reset elimina persistencia", () => {
    saveValidState(fixtureState());
    clearPersistedState();
    assert.equal(window.localStorage.getItem(STORAGE_KEY), null);
    assert.equal(loadValidState(), null);
  });

  it("rechaza JSON basura y limpia la key", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    assert.equal(loadValidState(), null);
    assert.equal(window.localStorage.getItem(STORAGE_KEY), null);
  });

  it("rechaza un estado que no reproduce el cálculo", () => {
    const tampered = fixtureState();
    tampered.result.minPriceClp = 1;
    assert.equal(isPersistedState(tampered), false);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tampered));
    assert.equal(loadValidState(), null);
  });

  it("no persiste un estado inválido vía saveValidState", () => {
    const bad = {
      version: 1 as const,
      inputs: fixtureInputs,
      result: {
        minPriceClp: 1,
        projectedProfitRaw: 0,
        feeRate: 0.035,
        minPriceRaw: 1,
      },
    };
    assert.equal(saveValidState(bad), false);
    assert.equal(window.localStorage.getItem(STORAGE_KEY), null);
  });
});
