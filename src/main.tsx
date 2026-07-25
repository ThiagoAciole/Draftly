import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { getWindowPlatform } from "./lib/windowPlatform";
import "./styles/globals.css";
import "./styles/shell.css";
import "./styles/titlebar.css";
import "./styles/home.css";
import "./styles/editor.css";

document.documentElement.dataset.platform = getWindowPlatform(navigator.userAgent);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
