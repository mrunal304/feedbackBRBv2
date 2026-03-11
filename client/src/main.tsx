import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./desktop.css";
import "./mobile.css";

createRoot(document.getElementById("root")!).render(<App />);
