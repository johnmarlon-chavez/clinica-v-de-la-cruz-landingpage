# Clínica Odontológica V de la Cruz

Sitio web de la Clínica Odontológica V de la Cruz: landing page informativa para pacientes y un panel administrativo privado para la gestión interna del consultorio.

## Estructura del proyecto

```
├── index.html          # Landing page pública (información, servicios, contacto)
├── css/style.css        # Estilos de la landing page
├── js/main.js            # Interactividad de la landing page
├── images/                # Imágenes de la landing page
├── admin/                 # Panel administrativo privado (solo para el doctor)
│   ├── index.html          # Login + dashboard (citas, pacientes, finanzas)
│   ├── js/firebase-config.js  # Configuración de conexión a Firebase
│   ├── js/panel.js             # Lógica del panel (Auth + Firestore)
│   └── robots.txt               # Bloquea la indexación del panel en buscadores
├── vercel.json          # Configuración de despliegue de la landing pública
├── package.json
└── SPEC.md              # Especificación de diseño de la landing page
```

## Landing page

Sitio estático (HTML/CSS/JS sin frameworks ni build tools), pensado para indexarse en Google. Se despliega en Vercel usando la configuración de [`vercel.json`](vercel.json).

Para correrlo localmente:

```bash
npx serve .
```

## Panel administrativo (`admin/`)

Herramienta privada de uso exclusivo del doctor: agenda de citas (calendario), directorio de pacientes y control financiero (ingresos/gastos/balance). No debe indexarse ni compartir dominio con la landing pública.

- **Autenticación**: Firebase Authentication (correo/contraseña), un único usuario.
- **Datos**: Firebase Firestore, bajo `doctores/{uid}/{citas|pacientes|finanzas}`.
- **Despliegue**: proyecto de Vercel independiente, con "Root Directory" apuntando a `admin/`, en un dominio propio y no listado.

Para configurar tu propia instancia, sigue los pasos de la consola de Firebase (crear proyecto, activar Authentication con correo/contraseña, crear el usuario del doctor, crear la base de datos Firestore en modo producción, y pegar las reglas de seguridad) y reemplaza los valores de ejemplo en `admin/js/firebase-config.js` con tu propio `firebaseConfig`.

## Stack

HTML, CSS y JavaScript vanilla (sin framework ni bundler) · [FullCalendar](https://fullcalendar.io/) para la agenda · [Firebase](https://firebase.google.com/) (Auth + Firestore) para el panel admin · [Vercel](https://vercel.com/) para el despliegue.
