import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { WalletProvider } from "./context/WalletContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./hooks/useStore";
import { CarbonPriceProvider } from "./context/CarbonPriceContext";
import App from "./App.jsx";
import "./index.css";
import "./styles/seller-globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <WalletProvider>
            <ThemeProvider>
              <CarbonPriceProvider>
                <App />
              </CarbonPriceProvider>
            </ThemeProvider>
          </WalletProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
