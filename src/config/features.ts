// Central registry for FEATURE_FLAG_* flags. Every flag lives here; no component
// may read process.env directly.
//
// Compare against "1" EXPLICITLY. Do NOT use a truthiness check: "0" is a truthy
// string in JavaScript, so `!!process.env.FEATURE_FLAG_CONTACT_PAGE` is `true`
// whenever the variable exists at all — which would silently invert the flag and
// turn the feature ON for any deployment that sets it to "0".
function isEnabled(value: string | undefined): boolean {
  return value === "1";
}

export const FEATURES = {
  contactPage: isEnabled(process.env.FEATURE_FLAG_CONTACT_PAGE),
} as const;
