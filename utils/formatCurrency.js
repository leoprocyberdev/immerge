export function fmtCurrency(currency) {
  //currency = currency / 100;
  currency = currency.toFixed(',');
  return currency;
}