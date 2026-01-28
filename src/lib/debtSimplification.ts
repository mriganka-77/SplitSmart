/**
 * Debt Simplification Algorithm
 * 
 * Minimizes the number of transactions needed to settle all debts
 * using a greedy algorithm that matches the largest debtor with the largest creditor.
 */

export interface NetBalance {
  userId: string;
  amount: number; // positive = is owed money (creditor), negative = owes money (debtor)
}

export interface OptimizedTransfer {
  from: string;
  to: string;
  amount: number;
}

export interface RawBalance {
  from_user: string;
  to_user: string;
  amount: number;
}

/**
 * Calculate net balances for each user from raw balance records
 */
export function calculateNetBalances(balances: RawBalance[]): NetBalance[] {
  const netMap = new Map<string, number>();

  for (const balance of balances) {
    // from_user owes to_user the amount
    // So from_user's net decreases, to_user's net increases
    const currentFrom = netMap.get(balance.from_user) || 0;
    const currentTo = netMap.get(balance.to_user) || 0;
    
    netMap.set(balance.from_user, currentFrom - balance.amount);
    netMap.set(balance.to_user, currentTo + balance.amount);
  }

  return Array.from(netMap.entries())
    .map(([userId, amount]) => ({ userId, amount: Math.round(amount * 100) / 100 }))
    .filter(b => Math.abs(b.amount) >= 0.01); // Filter out effectively zero balances
}

/**
 * Simplify debts to minimize number of transactions
 * Uses a greedy algorithm: match largest debtor with largest creditor
 */
export function simplifyDebts(netBalances: NetBalance[]): OptimizedTransfer[] {
  // Separate into creditors (positive) and debtors (negative)
  const creditors: NetBalance[] = [];
  const debtors: NetBalance[] = [];

  for (const balance of netBalances) {
    if (balance.amount > 0.01) {
      creditors.push({ ...balance });
    } else if (balance.amount < -0.01) {
      debtors.push({ userId: balance.userId, amount: Math.abs(balance.amount) });
    }
  }

  // Sort by amount descending
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: OptimizedTransfer[] = [];

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const settleAmount = Math.min(creditor.amount, debtor.amount);
    const roundedAmount = Math.round(settleAmount * 100) / 100;

    if (roundedAmount >= 0.01) {
      transfers.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: roundedAmount,
      });
    }

    creditor.amount -= settleAmount;
    debtor.amount -= settleAmount;

    // Round to avoid floating point issues
    creditor.amount = Math.round(creditor.amount * 100) / 100;
    debtor.amount = Math.round(debtor.amount * 100) / 100;

    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return transfers;
}

/**
 * Main function: takes raw balances and returns optimized transfers
 */
export function getOptimizedTransfers(rawBalances: RawBalance[]): OptimizedTransfer[] {
  const netBalances = calculateNetBalances(rawBalances);
  return simplifyDebts(netBalances);
}

/**
 * Calculate how many transactions were saved
 */
export function calculateSavings(
  originalCount: number,
  optimizedCount: number
): { saved: number; percentage: number } {
  const saved = Math.max(0, originalCount - optimizedCount);
  const percentage = originalCount > 0 ? Math.round((saved / originalCount) * 100) : 0;
  return { saved, percentage };
}
