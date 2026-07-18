"use client";

import { useEffect, useState } from "react";

export function useProgressiveText(text: string, enabled = true, chunkSize = 14, delay = 18) {
  const [visibleText, setVisibleText] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) {
      setVisibleText(text);
      return;
    }

    let cancelled = false;
    setVisibleText("");

    const chunks = text.match(new RegExp(`.{1,${chunkSize}}`, "g")) ?? [text];

    async function streamText() {
      for (const chunk of chunks) {
        if (cancelled) {
          return;
        }

        setVisibleText((current) => current + chunk);
        await new Promise((resolve) => window.setTimeout(resolve, delay));
      }
    }

    void streamText();

    return () => {
      cancelled = true;
    };
  }, [chunkSize, delay, enabled, text]);

  return visibleText;
}
