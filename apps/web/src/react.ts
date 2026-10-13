// Not loaded by any page. A second build entry that uses React and TanStack
// Query, so the build splits them into a file of their own, whose name only
// changes with their versions. Browsers keep it for a year (ADR 0018, 0024);
// scripts/build.ts drops this entry's own output.
import "react";
import "react-dom";
import "react-dom/client";
import "react/jsx-runtime";
// Re-exported, so the whole of it is shared rather than shaken into ours.
export * from "@tanstack/react-query";
