import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { ImageProtection } from "@/components/layout/image-protection";

describe("ImageProtection Component", () => {
  it("prevents contextmenu default on image elements", () => {
    const { container } = render(
      <div>
        <ImageProtection />
        <img id="test-img" src="/images/test.png" alt="Test" />
        <button id="download-btn" data-allow-download="true">
          Download
        </button>
      </div>
    );

    const img = container.querySelector("#test-img")!;
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    img.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("prevents dragstart default on image elements", () => {
    const { container } = render(
      <div>
        <ImageProtection />
        <img id="test-img" src="/images/test.png" alt="Test" />
      </div>
    );

    const img = container.querySelector("#test-img")!;
    const event = new Event("dragstart", { bubbles: true, cancelable: true });
    img.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("does not prevent contextmenu on explicit download buttons or links", () => {
    const { container } = render(
      <div>
        <ImageProtection />
        <a id="download-link" download="pass.pdf" href="/pass.pdf">
          Download Pass
        </a>
        <button id="download-btn" data-allow-download="true">
          Download Card
        </button>
      </div>
    );

    const link = container.querySelector("#download-link")!;
    const linkEvent = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    link.dispatchEvent(linkEvent);
    expect(linkEvent.defaultPrevented).toBe(false);

    const btn = container.querySelector("#download-btn")!;
    const btnEvent = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    btn.dispatchEvent(btnEvent);
    expect(btnEvent.defaultPrevented).toBe(false);
  });

  it("prevents contextmenu, selectstart, and copy on data-no-copy elements", () => {
    const { container } = render(
      <div>
        <ImageProtection />
        <div data-no-copy="true">
          <p id="protected-para">This is protected community information.</p>
        </div>
        <input id="test-input" type="text" defaultValue="Normal input" />
      </div>
    );

    const para = container.querySelector("#protected-para")!;

    // Context menu prevented
    const contextEvent = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    para.dispatchEvent(contextEvent);
    expect(contextEvent.defaultPrevented).toBe(true);

    // Select start prevented
    const selectEvent = new Event("selectstart", { bubbles: true, cancelable: true });
    para.dispatchEvent(selectEvent);
    expect(selectEvent.defaultPrevented).toBe(true);

    // Copy event prevented
    const copyEvent = new Event("copy", { bubbles: true, cancelable: true });
    para.dispatchEvent(copyEvent);
    expect(copyEvent.defaultPrevented).toBe(true);

    // Input elements are not prevented
    const input = container.querySelector("#test-input")!;
    const inputSelectEvent = new Event("selectstart", { bubbles: true, cancelable: true });
    input.dispatchEvent(inputSelectEvent);
    expect(inputSelectEvent.defaultPrevented).toBe(false);
  });
});
