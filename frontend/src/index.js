import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress benign ResizeObserver warnings (recharts triggers them on first paint)
// to prevent CRA's react-error-overlay from blocking the UI.
const RESIZE_OBSERVER_ERR =
  "ResizeObserver loop completed with undelivered notifications";
const RESIZE_OBSERVER_ERR_OLD = "ResizeObserver loop limit exceeded";

window.addEventListener("error", (e) => {
  if (
    e.message &&
    (e.message.includes(RESIZE_OBSERVER_ERR) ||
      e.message.includes(RESIZE_OBSERVER_ERR_OLD))
  ) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

window.addEventListener("unhandledrejection", (e) => {
  const msg = e.reason && (e.reason.message || String(e.reason));
  if (
    msg &&
    (msg.includes(RESIZE_OBSERVER_ERR) || msg.includes(RESIZE_OBSERVER_ERR_OLD))
  ) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
