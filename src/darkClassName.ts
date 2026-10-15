export const DEFAULT_DARK_CLASS_NAME = 'dark'

export function validateDarkClassName(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || /\s/u.test(value)) {
    throw new TypeError(
      'darkClassName must be a non-empty string without whitespace',
    )
  }
}
