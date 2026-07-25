import { describe, expect, it } from "vitest";
import { getWindowPlatform } from "./windowPlatform";

describe("getWindowPlatform", () => {
  it("identifica o Linux para aplicar o chrome nativo do GNOME", () => {
    expect(getWindowPlatform("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")).toBe("linux");
  });

  it("identifica o Windows para preservar a titlebar própria", () => {
    expect(getWindowPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")).toBe("windows");
  });
});
