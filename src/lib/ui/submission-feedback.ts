"use client";

export type SubmissionFeedback = { title: string; message: string; reference?: string };
const eventName = "csc:submission-feedback";

export function notifySubmissionSuccess(feedback: SubmissionFeedback) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SubmissionFeedback>(eventName, { detail: feedback }));
}

export function listenForSubmissionFeedback(listener: (feedback: SubmissionFeedback) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<SubmissionFeedback>).detail);
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}
