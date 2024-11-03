import Decimal from "decimal.js-light";

export function decimalToStripe(amount: number): number {
  return Math.ceil(new Decimal(amount).mul(new Decimal(100)).toNumber());
  // key is do NOT round up after multiplying by 100,
  // e.g., 8.38*100 --> 838.0000000000001
  // return Math.round(round2up(amount) * 100);
}

export function stripeToDecimal(amountStripe: number): number {
  return new Decimal(amountStripe).div(new Decimal(100)).toNumber();
}

export function decimalMultiply(a: number, b: number): number {
  const ab = new Decimal(a).mul(new Decimal(b)).toNumber();
  return ab;
}

// // add floats in v as exact decimals
// export function addDecimal(v: number[]): number {
//   let t = new Decimal(0);
//   for (const x of v) {
//     t = t.add(new Decimal(x));
//   }
//   return parseFloat(t.toString());
// }
