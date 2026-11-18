/** Bounds a read-only wait; never cancels or reorders native identity mutations. */
export function pricingDeadline<T>(operation: Promise<T>, milliseconds = 15_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Pricing timed out.")), milliseconds);
    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
