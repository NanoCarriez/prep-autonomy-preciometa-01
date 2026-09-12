# PrecioMeta

MiniApp para calcular el **precio mínimo de venta en CLP** que cubre exactamente cuatro componentes:

- costo base
- comisión porcentual sobre el precio de venta
- cargo fijo
- utilidad objetivo

Marcador visible: `PREP_AUTONOMY_PRECIOMETA_01`  
Prueba: `PREP_AUTONOMY_PRECIOMETA_01` (autonomía preparatoria, no Radar)

## Contrato matemático

El usuario escribe la comisión como porcentaje humano: `3.5` significa 3,5%, no 0.035.

```
FEE_RATE = FEE_PERCENT / 100
MIN_PRICE_RAW = (COST + FIXED_FEE + TARGET_PROFIT) / (1 - FEE_RATE)
MIN_PRICE_CLP = ceil(MIN_PRICE_RAW)
PROJECTED_PROFIT_RAW = MIN_PRICE_CLP - COST - FIXED_FEE - (MIN_PRICE_CLP * FEE_RATE)
```

No hay IVA, impuestos, envío ni otras reglas ocultas.

### Fixture

| Campo | Valor |
|---|---|
| COST | 10000 |
| FEE_PERCENT | 3.5 |
| FIXED_FEE | 500 |
| TARGET_PROFIT | 5000 |
| MIN_PRICE_CLP | **16063** |

`PROJECTED_PROFIT_RAW` debe cumplir `>= 5000` y `< 5001`.

## Persistencia

Último estado **válido** en `localStorage` con la key exacta:

```
prep_autonomy_preciometa_01_state
```

Restablecer limpia inputs, resultado y la key.

## Tests locales

```bash
npm run test:preciometa
npm run typecheck
npm run build
```

Archivos de contrato:

- [`src/lib/pricing.ts`](src/lib/pricing.ts)
- [`src/lib/pricing.test.ts`](src/lib/pricing.test.ts)
- [`src/lib/persist.ts`](src/lib/persist.ts)
- [`src/lib/persist.test.ts`](src/lib/persist.test.ts)
- [`src/components/precio-meta-app.tsx`](src/components/precio-meta-app.tsx)
- [`handoff/PREP_AUTONOMY_PRECIOMETA_01_BUILD_STATUS.json`](handoff/PREP_AUTONOMY_PRECIOMETA_01_BUILD_STATUS.json)
