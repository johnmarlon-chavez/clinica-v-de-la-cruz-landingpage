// Configuración de Firebase para el panel administrativo.
//
// Cómo obtener estos valores (una sola vez):
// 1. Entra a https://console.firebase.google.com/ y crea/abre tu proyecto.
// 2. Ícono de engranaje > "Configuración del proyecto" > pestaña "General".
// 3. En "Tus apps", crea una app Web (ícono </>) si no existe una.
// 4. Copia el objeto "firebaseConfig" que te muestra Firebase y pégalo abajo,
//    reemplazando los valores de ejemplo.
//
// Estos valores NO son secretos: la seguridad real la dan las reglas de
// Firestore y Firebase Authentication, no ocultar este archivo.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDP85bjNWTFGZtKJP8dieUNNYWxpIfvZSI",
    authDomain: "clinica-vdelacruz-admin.firebaseapp.com",
    projectId: "clinica-vdelacruz-admin",
    storageBucket: "clinica-vdelacruz-admin.firebasestorage.app",
    messagingSenderId: "728755700760",
    appId: "1:728755700760:web:a85fbaaa83312bc87fef6d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
