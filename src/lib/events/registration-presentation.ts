export type PaidRegistrationDisplayState = "pass" | "pending" | "confirmation_pending";

export function getPaidRegistrationPresentation(state: PaidRegistrationDisplayState) {
  if (state === "pending") return {
    heading: "You have already registered",
    message: "You have already registered and it is pending. CSC confirmation is pending.",
    passReady: false,
  };
  if (state === "confirmation_pending") return {
    heading: "You have already registered",
    message: "Your confirmation is pending. CSC is preparing your event pass.",
    passReady: false,
  };
  return {
    heading: "You have already registered",
    message: "You have already registered and you already have your Event pass.",
    passReady: true,
  };
}
