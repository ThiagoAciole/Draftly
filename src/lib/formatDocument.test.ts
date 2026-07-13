import { describe, expect, it } from "vitest";
import { formatDocumentContent } from "./formatDocument";

describe("document formatting", () => {
  it("formats JSON, JavaScript, TypeScript and HTML", async () => {
    await expect(formatDocumentContent('{"draftly":true}', "json")).resolves.toBe('{ "draftly": true }\n');
    await expect(formatDocumentContent("const x={ok:true}", "javascript")).resolves.toBe("const x = { ok: true };\n");
    await expect(formatDocumentContent("const x:string='ok'", "typescript")).resolves.toBe('const x: string = "ok";\n');
    await expect(formatDocumentContent("<main><h1>Oi</h1></main>", "html")).resolves.toBe("<main><h1>Oi</h1></main>\n");
  });

  it("does not format Python and rejects invalid JSON without changing it", async () => {
    await expect(formatDocumentContent("print( 'oi' )", "python")).resolves.toBe("print( 'oi' )");
    await expect(formatDocumentContent('{"draftly":', "json")).rejects.toThrow();
  });
});
