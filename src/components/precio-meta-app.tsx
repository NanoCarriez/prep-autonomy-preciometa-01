import { useEffect, useId, useState, type FormEvent } from "react";
import { Calculator, RotateCcw } from "lucide-react";
import {
  VISIBLE_MARKER,
  calculateMinPrice,
  parsePricingInputs,
  type PricingResult,
} from "@/lib/pricing";
import {
  EMPTY_FIELDS,
  clearPersistedState,
  loadValidState,
  saveValidState,
  buildPersistedState,
  type FormFields,
} from "@/lib/persist";
import { formatClpInteger, formatProjectedProfit } from "@/lib/format";
import { cn } from "@/lib/utils";

type FieldKey = keyof FormFields;

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  hint: string;
  suffix: string;
  inputMode: "numeric" | "decimal";
  autoComplete: string;
}> = [
  {
    key: "cost",
    label: "Costo base",
    hint: "Lo que te cuesta producir o comprar, en pesos.",
    suffix: "CLP",
    inputMode: "numeric",
    autoComplete: "off",
  },
  {
    key: "feePercent",
    label: "Comisión",
    hint: "Porcentaje sobre el precio de venta. Escribe 3.5 para 3,5%.",
    suffix: "%",
    inputMode: "decimal",
    autoComplete: "off",
  },
  {
    key: "fixedFee",
    label: "Cargo fijo",
    hint: "Cobro fijo por venta, en pesos. Usa 0 si no hay.",
    suffix: "CLP",
    inputMode: "numeric",
    autoComplete: "off",
  },
  {
    key: "targetProfit",
    label: "Utilidad objetivo",
    hint: "Lo que quieres ganar en esta venta, en pesos.",
    suffix: "CLP",
    inputMode: "numeric",
    autoComplete: "off",
  },
];

export function PrecioMetaApp() {
  const formId = useId();
  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<PricingResult | null>(null);
  const [restored, setRestored] = useState(false);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadValidState();
    if (saved) {
      setFields(saved.inputs);
      setResult({
        feeRate: saved.result.feeRate,
        minPriceRaw: saved.result.minPriceRaw,
        minPriceClp: saved.result.minPriceClp,
        projectedProfitRaw: saved.result.projectedProfitRaw,
      });
      setRestored(true);
    }
    setReady(true);
  }, []);

  function onChange(key: FieldKey, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    if (formError) setFormError(null);
  }

  function onCalculate(event: FormEvent) {
    event.preventDefault();
    const parsed = parsePricingInputs(fields);
    if (!parsed.ok) {
      setErrors(parsed.fieldErrors);
      setFormError(parsed.error);
      setResult(null);
      return;
    }

    const calc = calculateMinPrice(parsed.value);
    if (!calc.ok) {
      setFormError(calc.error);
      setResult(null);
      return;
    }

    setErrors({});
    setFormError(null);
    setResult(calc.value);
    setRestored(false);
    saveValidState(buildPersistedState(fields, calc.value));
  }

  function onReset() {
    setFields(EMPTY_FIELDS);
    setErrors({});
    setFormError(null);
    setResult(null);
    setRestored(false);
    clearPersistedState();
  }

  return (
    <div
      className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-8 sm:px-6 sm:pt-12"
      data-testid="app-shell"
      data-ready={ready ? "true" : "false"}
    >
      <header className="mb-6">
        <p className="mb-3 text-xs font-semibold tracking-widest text-primary uppercase">
          MiniApp de precio
        </p>
        <h1 className="font-display text-4xl leading-none font-semibold text-balance text-ink sm:text-5xl">
          PrecioMeta
        </h1>
        <p className="mt-3 max-w-sm text-pretty text-base leading-relaxed text-muted">
          Calcula el precio mínimo de venta en CLP que cubre costo, comisión,
          cargo fijo y tu utilidad. Sin IVA ni supuestos extra.
        </p>
      </header>

      <form
        id={formId}
        onSubmit={onCalculate}
        method="dialog"
        noValidate
        className="surface-card flex flex-col gap-5 p-5 sm:p-6"
      >
        {FIELDS.map((field) => {
          const error = errors[field.key];
          const inputId = `field-${field.key}`;
          const hintId = `${inputId}-hint`;
          const errorId = `${inputId}-error`;
          return (
            <div key={field.key} className="flex flex-col gap-2">
              <label htmlFor={inputId} className="text-sm font-semibold text-ink">
                {field.label}
              </label>
              <div className="relative">
                <input
                  id={inputId}
                  name={field.key}
                  data-testid={field.key}
                  value={fields[field.key]}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  inputMode={field.inputMode}
                  autoComplete={field.autoComplete}
                  spellCheck={false}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : hintId}
                  placeholder={field.key === "feePercent" ? "3.5" : "0"}
                  className={cn(
                    "h-12 w-full rounded-xl bg-bg pr-14 pl-4 text-base text-ink tabular-nums",
                    "shadow-[var(--shadow-input)] outline-none",
                    "placeholder:text-muted/50",
                    "transition-[box-shadow] duration-150 ease-out",
                    "focus-visible:shadow-[var(--shadow-input-focus)]",
                    error && "shadow-[var(--shadow-input-error)]",
                  )}
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs font-semibold tracking-wide text-muted uppercase">
                  {field.suffix}
                </span>
              </div>
              {error ? (
                <p id={errorId} role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : (
                <p id={hintId} className="text-sm leading-snug text-muted">
                  {field.hint}
                </p>
              )}
            </div>
          );
        })}

        {formError ? (
          <p
            role="alert"
            data-testid="form-error"
            className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger"
          >
            {formError}
          </p>
        ) : null}

        <div className="mt-1 grid grid-cols-2 gap-3">
          <button
            type="submit"
            data-testid="calculate"
            className={cn(
              "inline-flex h-12 items-center justify-center gap-2 rounded-xl",
              "bg-primary px-5 text-base font-semibold text-primary-fg",
              "shadow-[var(--shadow-primary)]",
              "transition-[transform,box-shadow] duration-150 ease-out",
              "hover:shadow-[var(--shadow-primary-hover)]",
              "active:scale-96",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            )}
          >
            <Calculator className="size-4" strokeWidth={2.2} aria-hidden />
            Calcular
          </button>
          <button
            type="button"
            data-testid="reset"
            onClick={onReset}
            className={cn(
              "inline-flex h-12 items-center justify-center gap-2 rounded-xl",
              "bg-surface px-5 text-base font-semibold text-ink",
              "shadow-[var(--shadow-border)]",
              "transition-[transform,box-shadow] duration-150 ease-out",
              "hover:shadow-[var(--shadow-border-hover)]",
              "active:scale-96",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            )}
          >
            <RotateCcw className="size-4" strokeWidth={2.2} aria-hidden />
            Restablecer
          </button>
        </div>
      </form>

      <section aria-live="polite" className="mt-5" data-testid="result-region">
        {result ? (
          <div className="result-card p-5 sm:p-6">
            {restored ? (
              <p className="mb-4 text-xs font-semibold tracking-widest text-primary-fg/70 uppercase">
                Último cálculo restaurado
              </p>
            ) : (
              <p className="mb-4 text-xs font-semibold tracking-widest text-primary-fg/70 uppercase">
                Resultado
              </p>
            )}
            <p className="text-sm font-medium text-primary-fg/80">
              Precio mínimo de venta
            </p>
            <p
              data-testid="min-price"
              className="font-display mt-1 text-5xl leading-none font-semibold tracking-tight text-primary-fg tabular-nums"
            >
              {formatClpInteger(result.minPriceClp)}
            </p>
            <p data-testid="min-price-raw" className="sr-only">
              {result.minPriceClp}
            </p>
            <div className="mt-6 border-t border-primary-fg/15 pt-5">
              <p className="text-sm font-medium text-primary-fg/80">
                Utilidad proyectada
              </p>
              <p
                data-testid="projected-profit"
                className="font-display mt-1 text-2xl font-semibold text-copper-soft tabular-nums"
              >
                {formatProjectedProfit(result.projectedProfitRaw)}
              </p>
              <p data-testid="projected-profit-raw" className="sr-only">
                {String(result.projectedProfitRaw)}
              </p>
              <p className="mt-2 text-sm leading-snug text-primary-fg/65">
                Tras costo, cargo fijo y comisión sobre el precio redondeado al
                peso.
              </p>
            </div>
          </div>
        ) : (
          <div className="empty-card px-5 py-6">
            <p className="text-sm leading-relaxed text-muted">
              Completa los cuatro campos y pulsa Calcular. El precio cubre
              exactamente esos componentes, nada más.
            </p>
          </div>
        )}
      </section>

      <footer className="mt-auto pt-10">
        <p
          data-testid="visible-marker"
          className="text-center text-xs tracking-widest text-muted/80 uppercase"
        >
          {VISIBLE_MARKER}
        </p>
      </footer>
    </div>
  );
}
