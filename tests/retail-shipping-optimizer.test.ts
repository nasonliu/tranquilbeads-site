import { describe, expect, it } from "vitest";

import { analyzeShippingSweetSpots, buildIdenticalItemParcelPlans } from "@/src/lib/retail/shipping-optimizer";

const baseInput = {
  countryCode: "US",
  postalCode: "10001",
  unitWeightGrams: 250,
  unitLengthMm: 160,
  unitWidthMm: 110,
  unitHeightMm: 55,
  outerPackagingWeightGrams: 80,
  outerPaddingMm: 10,
  maxQuantity: 6,
  packageType: "C" as const,
};

describe("retail shipping optimizer", () => {
  it("builds compact axis-aligned parcel plans and reports provider-neutral volumetric references", () => {
    const plans = buildIdenticalItemParcelPlans(baseInput);
    expect(plans).toHaveLength(6);
    expect(plans[0]).toMatchObject({ quantity: 1, weightGrams: 330, lengthMm: 180, widthMm: 130, heightMm: 75, unusedSlots: 0 });
    expect(plans[0].referenceVolumetricKg).toEqual({ "5000": 0.351, "6000": 0.292, "8000": 0.219, "12000": 0.146 });
    expect(plans[1].weightGrams).toBe(580);
    expect(plans[1].volumeCm3).toBeLessThan(plans[0].volumeCm3 * 2);
  });

  it("keeps weight and padding explicit instead of inventing a default product profile", () => {
    const withoutPadding = buildIdenticalItemParcelPlans({ ...baseInput, outerPackagingWeightGrams: 0, outerPaddingMm: 0, maxQuantity: 2 });
    expect(withoutPadding[0]).toMatchObject({ weightGrams: 250, lengthMm: 160, widthMm: 110, heightMm: 55 });
    expect(withoutPadding[1].weightGrams).toBe(500);
  });

  it("finds the lowest average cost only within the same provider service", () => {
    const rate = (productCode:string, amount:number) => ({ productCode, productName:productCode, priceName:"Contract", priceType:"AG", amount, currency:"CNY", origin:"YT-SZ" });
    const rows = [
      { quantity:1, rates:[rate("STANDARD",40),rate("EXPRESS",60)] },
      { quantity:2, rates:[rate("STANDARD",55),rate("EXPRESS",80)] },
      { quantity:3, rates:[rate("STANDARD",72),rate("EXPRESS",105)] },
    ].map((row)=>({ ...row, weightGrams:1, lengthMm:1, widthMm:1, heightMm:1, volumeCm3:1, unusedSlots:0, referenceVolumetricKg:{"5000":0,"6000":0,"8000":0,"12000":0} }));
    const spots = analyzeShippingSweetSpots(rows);
    expect(spots.find((spot)=>spot.productCode==="STANDARD")).toMatchObject({ recommendedQuantity:3, amountPerItem:24, savingsVersusSeparate:48 });
    expect(spots.find((spot)=>spot.productCode==="EXPRESS")).toMatchObject({ recommendedQuantity:3, amountPerItem:35, savingsVersusSeparate:75 });
  });

  it("does not compare a service that disappears at higher quantities as if it were another service", () => {
    const rows = [
      { quantity:1, rates:[{productCode:"LIGHT",productName:"Light",priceName:"P",priceType:"T",amount:20,currency:"CNY",origin:"YT-SZ"}] },
      { quantity:2, rates:[{productCode:"HEAVY",productName:"Heavy",priceName:"P",priceType:"T",amount:25,currency:"CNY",origin:"YT-SZ"}] },
    ].map((row)=>({ ...row, weightGrams:1, lengthMm:1, widthMm:1, heightMm:1, volumeCm3:1, unusedSlots:0, referenceVolumetricKg:{"5000":0,"6000":0,"8000":0,"12000":0} }));
    expect(analyzeShippingSweetSpots(rows)).toEqual([expect.objectContaining({ productCode:"LIGHT", recommendedQuantity:1 })]);
  });

  it("keeps currencies and origins in separate comparison groups", () => {
    const rows = [1,2].map((quantity)=>({ quantity, weightGrams:1, lengthMm:1, widthMm:1, heightMm:1, volumeCm3:1, unusedSlots:0, referenceVolumetricKg:{"5000":0,"6000":0,"8000":0,"12000":0}, rates:[
      {productCode:"SAME",productName:"Same",priceName:"P",priceType:"T",amount:20*quantity,currency:"CNY",origin:"YT-SZ"},
      {productCode:"SAME",productName:"Same",priceName:"P",priceType:"T",amount:4*quantity,currency:"USD",origin:"YT-SZ"},
      {productCode:"SAME",productName:"Same",priceName:"P",priceType:"T",amount:18*quantity,currency:"CNY",origin:"YT-GZ"},
    ] }));
    const spots=analyzeShippingSweetSpots(rows);
    expect(spots).toHaveLength(3);
    expect(new Set(spots.map((spot)=>spot.serviceKey)).size).toBe(3);
    expect(spots.map((spot)=>`${spot.currency}:${spot.origin}`)).toEqual(["CNY:YT-GZ","CNY:YT-SZ","USD:YT-SZ"]);
  });

  it("reports the quantity span when a service is missing from an intermediate tier", () => {
    const common={productCode:"S",productName:"S",priceName:"P",priceType:"T",currency:"CNY",origin:"YT-SZ"};
    const rows=[
      {quantity:1,rates:[{...common,amount:20}]},
      {quantity:2,rates:[]},
      {quantity:3,rates:[{...common,amount:42}]},
    ].map((row)=>({ ...row, weightGrams:1,lengthMm:1,widthMm:1,heightMm:1,volumeCm3:1,unusedSlots:0,referenceVolumetricKg:{"5000":0,"6000":0,"8000":0,"12000":0} }));
    expect(analyzeShippingSweetSpots(rows)[0].observations[1]).toMatchObject({quantity:3,deltaQuantity:2,incrementalAmount:22,incrementalAmountPerItem:11});
  });
});
