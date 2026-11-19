// Number helpers shared by the transformations and the validations. They sit in their own file so
// that validations.ts can use the rounder without importing transformations.ts, which imports
// validations.ts (the same reason normalizeSku sits in search.ts, P1). transformations.ts re-exports
// both, so code that imports them from there is unchanged.
/** A double holds 15 decimal digits reliably. What follows them is noise from binary arithmetic. */
const reliableDigits = 15;
/** From here up, 15 digits are used before the second decimal, so there are no cents to round. */
const largestAmountWithCents = 1e13;
/**
 * The value rounded to 15 significant digits, which drops the noise binary arithmetic adds at the far
 * end: `0.28 * 25` is 7.000000000000001, and this gives back 7. NaN and the infinities come back as
 * they are.
 */
export function removeFloatingPointNoise(value) {
    return Number(value.toPrecision(reliableDigits));
}
/**
 * The value rounded half up to 2 decimals, by its decimal value and not its binary one (Q5, Q21).
 * 35.55 * 1.3 is 46.215 by hand, but JavaScript holds 46.214999999999996 and `toFixed(2)` gives 46.21.
 * So the value is first read as 15 decimal digits ("4.62150000000000e+1"), and the decimal point is
 * moved two places by changing that text's exponent, which adds no error of its own; multiplying by
 * 100 would. A half goes up, toward positive infinity.
 */
export function roundToTwoDecimals(value) {
    if (!Number.isFinite(value) || Math.abs(value) >= largestAmountWithCents) {
        return value;
    }
    const [digits = "0", exponent = "0"] = value.toExponential(reliableDigits - 1).split("e");
    const cents = Math.round(Number(`${digits}e${Number(exponent) + 2}`));
    // Adding 0 turns a -0, which rounding a tiny negative gives, into 0.
    return cents / 100 + 0;
}
