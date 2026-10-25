/**
 * Foreign Exchange (FX) Multi-Currency Conversion & Valuation Engine
 * Normalizes multi-currency sales and catalog valuations without conflating currencies.
 */

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

/**
 * Convert any amount from one currency to target currency using USD baseline pivot
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customRates?: Record<string, number>
): number {
  if (!amount || amount === 0) return 0;
  const from = fromCurrency.toUpperCase().trim();
  const to = toCurrency.toUpperCase().trim();

  if (from === to) return amount;

  const rates = { ...DEFAULT_EXCHANGE_RATES_TO_USD, ...(customRates || {}) };

  const rateFrom = rates[from] || 1.0;
  const rateTo = rates[to] || 1.0;

  // Convert from -> USD -> to
  const amountInUsd = amount * rateFrom;
  const converted = amountInUsd / rateTo;

  return Math.round(converted * 100) / 100; // Round to 2 decimal places
}

/**
 * Summarize an array of multi-currency entries into:
 * 1. Native breakdown per currency
 * 2. Consolidated base currency valuation
 */
export function summarizeMultiCurrency(
  entries: { amount: number; currency: string }[],
  baseCurrency: string,
  customRates?: Record<string, number>
): {
  totalsByCurrency: Record<string, number>;
  consolidatedBaseTotal: number;
  hasMultipleCurrencies: boolean;
} {
  const totalsByCurrency: Record<string, number> = {};
  let consolidatedBaseTotal = 0;

  entries.forEach((e) => {
    const cur = (e.currency || baseCurrency).toUpperCase().trim();
    const val = Number(e.amount) || 0;

    totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + val;
    consolidatedBaseTotal += convertCurrency(val, cur, baseCurrency, customRates);
  });

  const distinctCurrencies = Object.keys(totalsByCurrency);

  return {
    totalsByCurrency,
    consolidatedBaseTotal: Math.round(consolidatedBaseTotal),
    hasMultipleCurrencies: distinctCurrencies.length > 1,
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
