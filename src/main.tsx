import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "superlore/runtime.css";
import "./theme/schemes.css";
import "./app.css";
import App from "./App";
import { AboutPage } from "./components/AboutPage";

const isAboutWindow = new URLSearchParams(location.search).has("about");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isAboutWindow ? <AboutPage /> : <App />}</React.StrictMode>,
);
