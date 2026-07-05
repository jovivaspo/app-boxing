// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoginFooter } from "./login-footer";

describe("LoginFooter", () => {
  it("renders the Elite Combat League brand and copyright line", () => {
    render(<LoginFooter />);

    expect(screen.getByText("ELITE COMBAT LEAGUE")).toBeInTheDocument();
    expect(
      screen.getByText("© 2026 ELITE COMBAT LEAGUE")
    ).toBeInTheDocument();
  });
});
