"use client";

import * as React from "react";

/**
 * ImageProtection & ContentProtection:
 * 1. Prevents right-click and mobile long-press image saving / downloading
 *    while preserving explicit download actions (event passes, ID cards, PDF exports).
 * 2. Prevents text selection, long-press copy menu, and clipboard copying on
 *    important community copy marked with `data-no-copy` or `.no-copy`,
 *    while ensuring inputs, form fields, and editable elements work normally.
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

    const isInteractiveEditable = (target: Element | null): boolean => {
      if (!target) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return true;
      if (target.getAttribute("contenteditable") === "true") return true;
      if (target.hasAttribute("data-allow-copy") || Boolean(target.closest("[data-allow-copy]"))) {
        return true;
      }
      return false;
    };

    const isProtectedTextTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Element)) return false;
      if (isInteractiveEditable(target)) return false;
      return Boolean(target.closest("[data-no-copy]") || target.closest(".no-copy"));
    };

    // Suppress context menu on images and protected important copy
    const handleContextMenu = (e: MouseEvent) => {
      if (isImageTarget(e.target) && !isExplicitDownload(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (isProtectedTextTarget(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Suppress dragging images and protected text to drop into other windows
    const handleDragStart = (e: DragEvent) => {
      if (isImageTarget(e.target) && !isExplicitDownload(e.target)) {
        e.preventDefault();
        return;
      }

      if (isProtectedTextTarget(e.target)) {
        e.preventDefault();
      }
    };

    // Suppress text selection start on protected community information
    const handleSelectStart = (e: Event) => {
      if (isProtectedTextTarget(e.target)) {
        e.preventDefault();
      }
    };

    // Suppress copy action if user tries to copy text inside protected elements
    const handleCopy = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && isInteractiveEditable(activeEl)) {
        return;
      }

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const anchorNode = selection.anchorNode;
        const targetEl = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
        if (targetEl && isProtectedTextTarget(targetEl)) {
          e.preventDefault();
          return;
        }
      }

      if (isProtectedTextTarget(e.target)) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu, { capture: true });
    document.addEventListener("dragstart", handleDragStart, { capture: true });
    document.addEventListener("selectstart", handleSelectStart, { capture: true });
    document.addEventListener("copy", handleCopy, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      document.removeEventListener("dragstart", handleDragStart, { capture: true });
      document.removeEventListener("selectstart", handleSelectStart, { capture: true });
      document.removeEventListener("copy", handleCopy, { capture: true });
    };
  }, []);

  return null;
}
