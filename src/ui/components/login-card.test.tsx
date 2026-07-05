// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/ui/hooks/use-google-auth", () => ({
  useGoogleAuth: vi.fn(),
}));

import { LoginCard } from "./login-card";

describe("LoginCard", () => {
  it("renders the Iron Pulse brand heading, tagline, and secure-auth label", () => {
    render(<LoginCard />);

    expect(screen.getByText("IRON PULSE")).toBeInTheDocument();
    expect(
      screen.getByText("Entrena duro, pelea inteligente.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("SISTEMA DE AUTENTICACIÓN SEGURA V1.0")
    ).toBeInTheDocument();
  });
});
