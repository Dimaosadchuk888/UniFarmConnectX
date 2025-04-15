import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Telegram WebApp integration setup
const initTelegramWebApp = () => {
  if (window.Telegram?.WebApp) {
    const webApp = window.Telegram.WebApp;
    webApp.expand();
    webApp.ready();
  }
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initTelegramWebApp);

createRoot(document.getElementById("root")!).render(<App />);
