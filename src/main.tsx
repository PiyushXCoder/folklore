import React from "react";
import ReactDOM from "react-dom/client";
import "superlore/runtime.css";
import "./theme/catppuccin.css";
import "./app.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
