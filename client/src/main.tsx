import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./desktop.css";
import "./mobile.css";
import "./tablet-responsive.css";

createRoot(document.getElementById("root")!).render(<App />);
