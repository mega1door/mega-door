import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initMetaPixel } from "./lib/metaPixel";
import "./index.css";
import "./styles/brand-colors.css";
import "./styles/desktop.css";

initMetaPixel();

// basename يطابق base بـ vite.config.ts - مطلوب لأن الموقع منشور بمسار فرعي
// (GitHub Pages) وليس بجذر الدومين حالياً.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
