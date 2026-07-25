import { describe, expect, it } from "vitest";
import { retryOnce } from "./retry";

describe("retryOnce", () => {
  it("repete uma operação que falha na primeira tentativa", async () => {
    let attempts = 0;
    const result = await retryOnce(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("disco ocupado");
      return "salvo";
    });

    expect(result).toBe("salvo");
    expect(attempts).toBe(2);
  });
});
