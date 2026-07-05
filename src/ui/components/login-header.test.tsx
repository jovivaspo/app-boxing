// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.fill;
    delete rest.unoptimized;
    delete rest.priority;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- test-only stub
    return <img {...rest} />;
  },
}));

import { LoginHeader } from "./login-header";

describe("LoginHeader", () => {
  it("renders the Iron Pulse logo asset instead of the AuthShell text brand", () => {
    render(<LoginHeader />);

    expect(
      screen.getByRole("img", { name: "Iron Pulse" })
    ).toBeInTheDocument();
    expect(screen.queryByText("AuthShell")).not.toBeInTheDocument();
  });
});
