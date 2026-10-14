export function consumption(previous, current) {
  const start = Number(previous);
  const end = Number(current);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
    throw new Error('Readings must be non-negative and current must not be less than previous.');
  }
  return Number((end - start).toFixed(4));
}

export function estimateBill({ units, ratePerUnit, fixedCharge = 0 }) {
  const usage = Number(units);
  const rate = Number(ratePerUnit);
  const fixed = Number(fixedCharge);
  if (![usage, rate, fixed].every(Number.isFinite) || usage < 0 || rate < 0 || fixed < 0) {
    throw new Error('Usage, rate and fixed charge must be valid non-negative numbers.');
  }
  return Number((usage * rate + fixed).toFixed(2));
}
