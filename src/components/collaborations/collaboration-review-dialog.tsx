"use client";

import * as React from "react";
import { ReviewDialog } from "@/components/reviews/review-dialog";

export interface CollaborationReviewDialogProps {
  collaborationId: string;
  collaborationTitle: string;
  className?: string;
  buttonLabel?: string;
}

export function CollaborationReviewDialog({
  collaborationId,
  collaborationTitle,
  className,
  buttonLabel = "Ratings and Review",
}: CollaborationReviewDialogProps) {
  return (
    <ReviewDialog
      type="collaboration"
      collaborationId={collaborationId}
      collaborationTitle={collaborationTitle}
      buttonLabel={buttonLabel}
      className={className}
      hashTrigger={true}
    />
  );
}
