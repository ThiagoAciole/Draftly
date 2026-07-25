export type WindowPlatform = "linux" | "windows" | "other";

export function getWindowPlatform(userAgent: string): WindowPlatform {
  if (/Linux/i.test(userAgent)) return "linux";
  if (/Windows/i.test(userAgent)) return "windows";
  return "other";
}
