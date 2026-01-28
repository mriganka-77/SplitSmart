// Currency formatting utilities for SplitSmart

export const formatCurrency = (amount: number, options?: { showSign?: boolean }) => {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  if (options?.showSign && amount !== 0) {
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  }

  return formatted;
};

export const formatCompactCurrency = (amount: number) => {
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

export const parseCurrencyInput = (value: string): number => {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[₹,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
