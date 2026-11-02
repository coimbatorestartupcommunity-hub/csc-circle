"use client";

import * as React from "react";
import {
  PaymentModal,
  type PaymentOrderDetails,
} from "@/components/payments/payment-modal";
import type { PaymentDeepLinks } from "@/lib/payments/upi";

export type OrderInfo = PaymentOrderDetails;

export interface UpiCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderInfo | null;
  deepLinks: PaymentDeepLinks | null;
  eventTitle: string;
  attendeeName: string;
  eventDates?: { startsAt: string; endsAt?: string; location?: string };
  onResetOrder?: () => void;
}

export function UpiCheckoutModal(props: UpiCheckoutModalProps) {
  return <PaymentModal {...props} />;
}
