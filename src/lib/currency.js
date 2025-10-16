export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '';
  try {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount));
  } catch (e) {
    return `LKR ${Number(amount).toFixed(2)}`;
  }
}

export default formatCurrency;
