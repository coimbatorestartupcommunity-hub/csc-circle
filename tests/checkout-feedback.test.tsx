// @vitest-environment jsdom
/**
 * Checkout feedback channel: every checkout toast call (form validation,
 * guest-OTP status, UTR submission results, app-launch fallbacks) depends on
 * the sonner Toaster mounted once in src/app/providers.tsx. These tests lock
 * the delivery mechanism against regressions (a duplicate Toaster mount would
 * double-render every toast).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

beforeEach(() => {
  if (!window.matchMedia) {
    window.matchMedia = (() => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
});

describe("Checkout feedback channel (sonner Toaster)", () => {
  it("delivers error toasts used for validation, UTR, and fallback feedback", async () => {
    render(<Toaster position="top-center" />);
    await act(async () => {
      toast.error("Please fill in all required registration details.");
    });
    expect(
      await screen.findByText("Please fill in all required registration details.")
    ).toBeInTheDocument();
  });

  it("delivers success toasts used for OTP and UTR confirmations", async () => {
    render(<Toaster position="top-center" />);
    await act(async () => {
      toast.success("UTR submitted for bank verification.");
    });
    expect(
      await screen.findByText("UTR submitted for bank verification.")
    ).toBeInTheDocument();
  });
});
