"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      containerStyle={{ zIndex: 99999 }}
      toastOptions={{
        duration: 3000,
        style: {
          background: "var(--toast-bg)",
          color: "var(--toast-text)",
          border: `1px solid var(--toast-border)`,
          borderRadius: "12px",
          fontSize: "13px",
          fontWeight: 500,
          boxShadow: "0 8px 32px var(--shadow-heavy), 0 0 0 1px var(--surface-border)",
          padding: "12px 16px",
        },
        success: {
          iconTheme: { primary: "#a78bfa", secondary: "var(--toast-bg)" },
        },
        error: {
          iconTheme: { primary: "#f87171", secondary: "var(--toast-bg)" },
        },
      }}
    />
  );
}
