"use client";

import * as React from "react";

/**
 * ImageProtection: Prevents right-click and mobile long-press image saving / downloading
 * across the site while preserving functional download actions (event passes, ID cards, PDF exports).
 */
export function ImageProtection() {
  React.useEffect(() => {
    const isImageTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Element)) return false;
      return (
        target.tagName === "IMG" ||
        target.tagName === "PICTURE" ||
        Boolean(target.closest("img")) ||
        Boolean(target.closest("picture")) ||
        target.hasAttribute("data-no-download") ||
        Boolean(target.closest("[data-no-download]"))
      );
    };

    const isExplicitDownload = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Element)) return false;
      return (
        target.hasAttribute("data-allow-download") ||
        Boolean(target.closest("[data-allow-download='true']")) ||
        Boolean(target.closest("a[download]")) ||
        Boolean(target.closest("button[data-download]"))
      );
    };

    // Suppress context menu on images (stops desktop right-click and mobile Android/iOS long-press "Save Image" / "Download")
    const handleContextMenu = (e: MouseEvent) => {
      if (isImageTarget(e.target) && !isExplicitDownload(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Suppress dragging images to save or drop into another tab/desktop
    const handleDragStart = (e: DragEvent) => {
      if (isImageTarget(e.target) && !isExplicitDownload(e.target)) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu, { capture: true });
    document.addEventListener("dragstart", handleDragStart, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      document.removeEventListener("dragstart", handleDragStart, { capture: true });
    };
  }, []);

  return null;
}
