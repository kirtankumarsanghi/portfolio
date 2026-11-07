import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import unboundedLatin from "@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2";
import "./index.css";
import App from "./App";

/* Self-hosted display face: latin subset only (variable 100–900), font-display: swap.
   Registered before render so the big headlines never fall back to Helvetica/Inter. */
if (typeof FontFace !== "undefined") {
  const face = new FontFace("Unbounded Variable", `url(${unboundedLatin}) format("woff2-variations")`, {
    weight: "100 900",
    style: "normal",
    display: "swap",
  });
  face
    .load()
    .then((loaded) => document.fonts.add(loaded))
    .catch(() => undefined);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
