import React from "react";
import { createRoot } from "react-dom/client";
import { RootApp } from "./components/RootApp";
import { Acknowledgements } from "./components/Acknowledgements";
import { loadInterfaceFonts } from "./fonts";
import "./base.css";

if (
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  window.location.protocol.startsWith("http")
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const root = createRoot(document.getElementById("root")!);
const fontLoading = loadInterfaceFonts();
const acknowledgements = /^\/agradecimientos\/?$/.test(location.pathname);
if (acknowledgements) fontLoading.activateInterface();
root.render(
  <React.StrictMode>
    {acknowledgements ? (
      <Acknowledgements />
    ) : (
      <RootApp fontLoading={fontLoading} />
    )}
  </React.StrictMode>,
);
