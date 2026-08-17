import { z } from "zod";

export const shippingOptimizationDto = z.object({
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  postalCode: z.string().trim().max(30).default(""),
  unitWeightGrams: z.number().int().min(1).max(30_000),
  unitLengthMm: z.number().int().min(1).max(2_000),
  unitWidthMm: z.number().int().min(1).max(2_000),
  unitHeightMm: z.number().int().min(1).max(2_000),
  outerPackagingWeightGrams: z.number().int().min(0).max(5_000).default(50),
  outerPaddingMm: z.number().int().min(0).max(100).default(10),
  maxQuantity: z.number().int().min(2).max(6).default(6),
  packageType: z.enum(["C", "E"]).default("C"),
}).strict();

export type ShippingOptimizationInput = z.infer<typeof shippingOptimizationDto>;

export type ParcelPlan = {
  quantity: number;
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  volumeCm3: number;
  unusedSlots: number;
  referenceVolumetricKg: Record<"5000" | "6000" | "8000" | "12000", number>;
};

type ComparableRate = {
  productCode: string;
  productName: string;
  priceName: string;
  priceType: string;
  amount: number;
  currency: string;
  origin: string;
};

export type ShippingOptimizationRow<TRate extends ComparableRate = ComparableRate> = ParcelPlan & { rates: TRate[] };

export type ShippingSweetSpot = {
  serviceKey: string;
  productCode: string;
  productName: string;
  currency: string;
  origin: string;
  recommendedQuantity: number;
  totalAmount: number;
  amountPerItem: number;
  savingsVersusSeparate: number;
  observations: Array<{
    quantity: number;
    totalAmount: number;
    amountPerItem: number;
    deltaQuantity: number;
    incrementalAmount: number;
    incrementalAmountPerItem: number;
    savingsVersusSeparate: number;
  }>;
};

const round = (value: number, digits = 3) => Number(value.toFixed(digits));

function permutations(values: [number, number, number]) {
  const output = new Map<string, [number, number, number]>();
  for (const value of [
    [values[0], values[1], values[2]], [values[0], values[2], values[1]],
    [values[1], values[0], values[2]], [values[1], values[2], values[0]],
    [values[2], values[0], values[1]], [values[2], values[1], values[0]],
  ] as Array<[number, number, number]>) output.set(value.join("x"), value);
  return [...output.values()];
}

export function buildIdenticalItemParcelPlans(input: ShippingOptimizationInput): ParcelPlan[] {
  const parsed = shippingOptimizationDto.parse(input);
  const itemOrientations = permutations([parsed.unitLengthMm, parsed.unitWidthMm, parsed.unitHeightMm]);
  const plans: ParcelPlan[] = [];

  for (let quantity = 1; quantity <= parsed.maxQuantity; quantity += 1) {
    let best: { dimensions: [number, number, number]; slots: number; volume: number; longest: number } | null = null;
    for (const item of itemOrientations) {
      for (let x = 1; x <= quantity; x += 1) {
        for (let y = 1; y <= quantity; y += 1) {
          const zCount = Math.ceil(quantity / (x * y));
          const slots = x * y * zCount;
          const dimensions: [number, number, number] = [
            item[0] * x + parsed.outerPaddingMm * 2,
            item[1] * y + parsed.outerPaddingMm * 2,
            item[2] * zCount + parsed.outerPaddingMm * 2,
          ].sort((a, b) => b - a) as [number, number, number];
          const volume = dimensions[0] * dimensions[1] * dimensions[2];
          const candidate = { dimensions, slots, volume, longest: dimensions[0] };
          if (!best || candidate.volume < best.volume || (candidate.volume === best.volume && candidate.longest < best.longest) || (candidate.volume === best.volume && candidate.longest === best.longest && candidate.slots < best.slots)) best = candidate;
        }
      }
    }
    if (!best) throw new Error("parcel_plan_unavailable");
    const volumeCm3 = best.volume / 1_000;
    plans.push({
      quantity,
      weightGrams: parsed.unitWeightGrams * quantity + parsed.outerPackagingWeightGrams,
      lengthMm: best.dimensions[0],
      widthMm: best.dimensions[1],
      heightMm: best.dimensions[2],
      volumeCm3: round(volumeCm3),
      unusedSlots: best.slots - quantity,
      referenceVolumetricKg: {
        "5000": round(volumeCm3 / 5_000),
        "6000": round(volumeCm3 / 6_000),
        "8000": round(volumeCm3 / 8_000),
        "12000": round(volumeCm3 / 12_000),
      },
    });
  }
  return plans;
}

function serviceKey(rate: ComparableRate) {
  return [rate.productCode, rate.priceName, rate.priceType, rate.currency, rate.origin].join("|");
}

export function analyzeShippingSweetSpots<TRate extends ComparableRate>(rows: Array<ShippingOptimizationRow<TRate>>): ShippingSweetSpot[] {
  const first = rows.find((row) => row.quantity === 1);
  if (!first) return [];
  const firstRates = new Map(first.rates.map((rate) => [serviceKey(rate), rate]));
  const spots: ShippingSweetSpot[] = [];

  for (const [key, baseRate] of firstRates) {
    const observations: ShippingSweetSpot["observations"] = [];
    let previousAmount = 0;
    let previousQuantity = 0;
    for (const row of rows) {
      const rate = row.rates.find((candidate) => serviceKey(candidate) === key);
      if (!rate) continue;
      const deltaQuantity = row.quantity - previousQuantity;
      const incrementalAmount = rate.amount - previousAmount;
      observations.push({
        quantity: row.quantity,
        totalAmount: round(rate.amount, 2),
        amountPerItem: round(rate.amount / row.quantity, 2),
        deltaQuantity,
        incrementalAmount: round(incrementalAmount, 2),
        incrementalAmountPerItem: round(incrementalAmount / deltaQuantity, 2),
        savingsVersusSeparate: round(baseRate.amount * row.quantity - rate.amount, 2),
      });
      previousAmount = rate.amount;
      previousQuantity = row.quantity;
    }
    if (!observations.length) continue;
    const recommended = [...observations].sort((a, b) => a.amountPerItem - b.amountPerItem || a.quantity - b.quantity)[0];
    spots.push({
      serviceKey: key,
      productCode: baseRate.productCode,
      productName: baseRate.productName,
      currency: baseRate.currency,
      origin: baseRate.origin,
      recommendedQuantity: recommended.quantity,
      totalAmount: recommended.totalAmount,
      amountPerItem: recommended.amountPerItem,
      savingsVersusSeparate: recommended.savingsVersusSeparate,
      observations,
    });
  }
  return spots.sort((a, b) => a.currency.localeCompare(b.currency) || a.amountPerItem - b.amountPerItem || a.origin.localeCompare(b.origin) || a.productCode.localeCompare(b.productCode));
}
