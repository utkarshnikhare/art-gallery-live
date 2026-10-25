/**
 * Foreign Exchange (FX) Multi-Currency Conversion & Valuation Engine
 * Normalizes multi-currency sales and catalog valuations without conflating currencies.
 */

/**
 * Foreign Exchange (FX) Multi-Currency Conversion & Valuation Engine
 * Normalizes multi-currency sales and catalog valuations without conflating currencies.
 * Implements honest benchmark rate disclosures, user-entered rate overrides,
 * unsupported currency isolation, and zero-sum/negative amount preservation.
 */

export const FX_PROVIDER_NAME = 'Fixed Reference Benchmark Matrix (ECB & RBI official reference snapshot)';
export const FX_REFERENCE_DATE = '2026-10-25';
export const IS_LIVE_FX_FEED = false;

export const FX_DISCLAIMER_NOTICE =
  'STATIC REFERENCE RATES: Exchange rates are fixed benchmark estimates for studio planning purposes and NOT a live market ticker. Historical transactions preserve their original recorded currencies and amounts. For precise financial reporting, artists can override rates in Profile Settings or consult bank settlement records.';

export const DEFAULT_EXCHANGE_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,    // 1 EUR = 1.08 USD
  GBP: 1.29,    // 1 GBP = 1.29 USD
  INR: 0.0119,  // 1 INR = 0.0119 USD (~84.0 INR per USD)
  CAD: 0.72,    // 1 CAD = 0.72 USD
  AUD: 0.65,    // 1 AUD = 0.65 USD
  JPY: 0.0065,  // 1 JPY = 0.0065 USD
  CHF: 1.13,    // 1 CHF = 1.13 USD
  SGD: 0.76,    // 1 SGD = 0.76 USD
};

export const FX_RATES_TO_USD = DEFAULT_EXCHANGE_RATES_TO_USD;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥',
  CHF: 'CHF',
  SGD: 'SG$',
};

export interface MultiCurrencySummary {
  totalsByCurrency: Record<string, number>;
  consolidatedBaseTotal: number;
  hasMultipleCurrencies: boolean;
  hasUnsupportedCurrencies: boolean;
  unsupportedCurrencies: string[];
  rateDate: string;
  provider: string;
  isEstimated: boolean;
}

/**
 * Check whether a currency is supported in the current rate matrix
 */
export function isCurrencySupported(currency: string, customRates?: Record<string, number>): boolean {
  if (!currency) return false;
  const cur = currency.toUpperCase().trim();
  const rates = { ...DEFAULT_EXCHANGE_RATES_TO_USD, ...(customRates || {}) };
  return typeof rates[cur] === 'number';
}

/**
 * Convert any amount from one currency to target currency using USD baseline pivot
 * Accurately preserves negative values (refunds/adjustments) and rejects unsupported currencies.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customRates?: Record<string, number>
): number {
  if (amount === 0 || !amount) return 0;
  const from = (fromCurrency || 'USD').toUpperCase().trim();
  const to = (toCurrency || 'USD').toUpperCase().trim();

  // If currencies match, value is identical regardless of rate support
  if (from === to) return amount;

  const rates = { ...DEFAULT_EXCHANGE_RATES_TO_USD, ...(customRates || {}) };

  const rateFrom = rates[from];
  const rateTo = rates[to];

  // If either rate is unknown, return NaN to prevent silent erroneous 1:1 conversions
  if (rateFrom === undefined || rateTo === undefined || rateTo === 0) {
    return NaN;
  }

  // Convert from -> USD -> to
  const amountInUsd = amount * rateFrom;
  const converted = amountInUsd / rateTo;

  return Math.round(converted * 100) / 100; // Round to 2 decimal places
}

/**
 * Summarize an array of multi-currency entries into:
 * 1. Native breakdown per currency (preserving original recorded currencies)
 * 2. Consolidated base currency valuation (if all rates are supported)
 */
export function summarizeMultiCurrency(
  entries: { amount: number; currency: string }[],
  baseCurrency: string,
  customRates?: Record<string, number>
): MultiCurrencySummary {
  const totalsByCurrency: Record<string, number> = {};
  let consolidatedBaseTotal = 0;
  const unsupportedCurrencies: string[] = [];
  const base = (baseCurrency || 'USD').toUpperCase().trim();

  entries.forEach((e) => {
    const cur = (e.currency || base).toUpperCase().trim();
    const val = Number(e.amount) || 0;

    totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + val;

    const converted = convertCurrency(val, cur, base, customRates);
    if (isNaN(converted)) {
      if (!unsupportedCurrencies.includes(cur)) {
        unsupportedCurrencies.push(cur);
      }
    } else {
      consolidatedBaseTotal += converted;
    }
  });

  const distinctCurrencies = Object.keys(totalsByCurrency);
  const hasUnsupported = unsupportedCurrencies.length > 0;

  return {
    totalsByCurrency,
    consolidatedBaseTotal: Math.round(consolidatedBaseTotal),
    hasMultipleCurrencies: distinctCurrencies.length > 1,
    hasUnsupportedCurrencies: hasUnsupported,
    unsupportedCurrencies,
    rateDate: FX_REFERENCE_DATE,
    provider: FX_PROVIDER_NAME,
    isEstimated: true,
  };
}

/**
 * Format currency with international formatting and standard symbol
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
  const cur = currency.toUpperCase().trim();
  const symbol = CURRENCY_SYMBOLS[cur] || cur;
  return `${symbol} ${Math.round(amount).toLocaleString()}`;
}
