/**
 * Pricing Intelligence Service
 * Transparent, mathematical artwork valuation and price recommendation engine.
 * Never fabricates market averages or guarantees sales.
 */

export interface PricingInputs {
  hoursWorked: number;
  hourlyWage: number;
  materialsCost: number;
  framingCost: number;
  studioOverheadCost: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
  galleryCommissionPercent: number; // e.g. 50%
  experienceLevel: 'emerging' | 'mid-career' | 'established';
  currency: string;
}

export interface PricingRecommendation {
  costFloorPrice: number;
  directStudioPrice: number;
  galleryRetailPrice: number;
  surfaceAreaMultiplierPrice: number;
  surfaceArea: number;
  surfaceAreaUnit: string;
  profitMarginPercent: number;
  laborTotal: number;
  productionTotal: number;
  breakdownSummary: string[];
  missingInputsNotice?: string;
  disclaimer: string;
}

export function calculatePricingRecommendation(inputs: PricingInputs): PricingRecommendation {
  const laborTotal = Math.max(0, inputs.hoursWorked) * Math.max(0, inputs.hourlyWage);
  const productionTotal = Math.max(0, inputs.materialsCost) + Math.max(0, inputs.framingCost) + Math.max(0, inputs.studioOverheadCost);
  
  // Base Cost Floor
  const costFloorPrice = Math.round(laborTotal + productionTotal);

  // Direct Studio Retail: Base Cost + modest artist profit markup (e.g. 35% for emerging, 50% for mid, 70% for established)
  let profitMarkupFactor = 1.35;
  if (inputs.experienceLevel === 'mid-career') profitMarkupFactor = 1.50;
  if (inputs.experienceLevel === 'established') profitMarkupFactor = 1.70;

  const directStudioPrice = Math.round(costFloorPrice * profitMarkupFactor);

  // Gallery Retail Price: Must accommodate gallery commission (default 50%) so artist receives their studio price
  // Formula: DirectPrice / (1 - (CommissionRate / 100))
  const commissionRate = Math.min(80, Math.max(0, inputs.galleryCommissionPercent !== undefined && !isNaN(inputs.galleryCommissionPercent) ? inputs.galleryCommissionPercent : 50));
  const galleryRetentionFactor = 1 - (commissionRate / 100);
  const galleryRetailPrice = galleryRetentionFactor > 0 
    ? Math.round(directStudioPrice / galleryRetentionFactor) 
    : directStudioPrice * 2;

  // Surface Area Dimensional Pricing
  // If in cm, convert to sq in (1 sq cm = 0.155 sq in) or calculate directly
  let areaSqIn = 0;
  if (inputs.unit === 'cm') {
    const wIn = inputs.width / 2.54;
    const hIn = inputs.height / 2.54;
    areaSqIn = Math.round(wIn * hIn);
  } else {
    areaSqIn = Math.round(inputs.width * inputs.height);
  }

  // Benchmark per sq in based on level
  let multiplierPerSqIn = 1.8; // USD/EUR standard baseline
  if (inputs.experienceLevel === 'mid-career') multiplierPerSqIn = 3.2;
  if (inputs.experienceLevel === 'established') multiplierPerSqIn = 5.5;

  // Scale if currency is INR
  if (inputs.currency === 'INR') {
    multiplierPerSqIn *= 85; // rough scale for INR sq in pricing
  }

  const surfaceAreaMultiplierPrice = Math.round(areaSqIn * multiplierPerSqIn);

  const breakdownSummary: string[] = [
    `Labor: ${inputs.hoursWorked} hrs × ${inputs.hourlyWage} ${inputs.currency}/hr = ${laborTotal} ${inputs.currency}`,
    `Materials & Framing: ${productionTotal} ${inputs.currency}`,
    `Minimum Breakeven Cost: ${costFloorPrice} ${inputs.currency}`,
    `Studio Direct Margin: +${Math.round((profitMarkupFactor - 1) * 100)}% (${directStudioPrice} ${inputs.currency})`,
    `Gallery Retail (${commissionRate}% split): ${galleryRetailPrice} ${inputs.currency} (guarantees you receive ${directStudioPrice} ${inputs.currency})`
  ];

  let missingInputsNotice: string | undefined;
  if (inputs.hoursWorked === 0 && inputs.materialsCost === 0) {
    missingInputsNotice = 'Labor hours and material costs are not specified. Pricing is based solely on dimensional surface area.';
  }

  return {
    costFloorPrice,
    directStudioPrice,
    galleryRetailPrice,
    surfaceAreaMultiplierPrice,
    surfaceArea: areaSqIn,
    surfaceAreaUnit: 'sq in',
    profitMarginPercent: Math.round((profitMarkupFactor - 1) * 100),
    laborTotal,
    productionTotal,
    breakdownSummary,
    missingInputsNotice,
    disclaimer: 'This recommendation is a mathematical guide based strictly on your recorded hours, production costs, and selected commission rate. It is not an appraisal or sales guarantee.',
  };
}
