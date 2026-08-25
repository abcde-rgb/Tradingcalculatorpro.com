import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { initPWA } from "@/lib/pwa";
import { bootI18n } from "@/lib/i18n";

initPWA();

const root = ReactDOM.createRoot(document.getElementById("root"));
const pintar = () =>
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

// Ningún diccionario viaja en main.js, así que hay que esperar al del idioma
// que toque antes de pintar: sin él `t()` devuelve la clave cruda y la primera
// pantalla sale con `heroTitle` en el titular. `bootI18n` resuelve idioma
// (?lang= → guardado → navegador) y carga UNO solo.
//
// El `catch` no es adorno: si se traga el fallo aquí, un error al resolver el
// idioma dejaría la página en blanco para siempre en vez de degradarse. Pintar
// con claves crudas es feo; no pintar es una web caída.
bootI18n()
  .catch((err) => console.error("[i18n] arranque fallido, se pinta igual:", err))
  .finally(pintar);
