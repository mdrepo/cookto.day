import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { App } from "./app.js";

// The page's only script (ADR 0018). The HTML already shows the English page,
// so it reads before this runs; React then takes it over in one frame.

const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  flushSync(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}
