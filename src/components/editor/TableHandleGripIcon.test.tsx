// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TableHandleGripIcon } from "./TableHandleGripIcon";

describe("TableHandleGripIcon", () => {
  it("usa o grip horizontal para uma linha", () => {
    render(<TableHandleGripIcon orientation="row" />);

    expect(screen.getByTestId("table-grip-row")).toBeTruthy();
  });

  it("usa o grip vertical para uma coluna", () => {
    render(<TableHandleGripIcon orientation="column" />);

    expect(screen.getByTestId("table-grip-column")).toBeTruthy();
  });
});
