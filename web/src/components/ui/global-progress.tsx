"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";

export function GlobalProgress() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = fetching + mutating > 0;

  if (!active) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 pointer-events-none overflow-hidden"
      role="progressbar"
      aria-label="Loading"
    >
      <div className="absolute inset-0 bg-primary/15" />
      <div className="absolute top-0 h-full w-1/3 bg-primary animate-progress-slide" />
    </div>
  );
}
