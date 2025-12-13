import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Run data integrity validation in development
import { runDevValidation } from "@/lib/dataIntegrityValidation";
runDevValidation();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
