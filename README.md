<div align="center">

# 🦷 Clínica Odontológica V de la Cruz

Sitio web de la clínica: landing page pública para pacientes y panel administrativo privado para la gestión interna del consultorio.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

</div>

---

## 📁 Estructura del proyecto

```
clinica-v-de-la-cruz/
│
├── index.html              # Landing page pública (Hero, Servicios, Nosotros, Contacto)
├── css/
│   └── style.css             # Estilos de la landing page
├── js/
│   └── main.js                # Modal de servicios, menú móvil, scroll-reveal, formulario
├── images/
│   └── logo.jpg                # Logo de la clínica
│
├── admin/                   # Panel administrativo privado (solo para el doctor)
│   ├── index.html              # Login + dashboard (citas, pacientes, finanzas)
│   ├── images/logo.jpg
│   ├── js/
│   │   ├── firebase-config.js    # Configuración de conexión a Firebase
│   │   └── panel.js               # Lógica del panel (Auth + Firestore)
│   └── robots.txt                 # Bloquea la indexación del panel en buscadores
│
├── robots.txt               # SEO: permite indexar la landing pública
├── sitemap.xml               # SEO: mapa del sitio para buscadores
├── vercel.json               # Configuración de despliegue de la landing pública
├── package.json
└── SPEC.md                   # Especificación de diseño de la landing page
```

## 🌐 Landing page

Sitio estático (HTML/CSS/JS vanilla, sin frameworks ni build tools), pensado para indexarse en Google. Incluye datos estructurados (JSON-LD), Open Graph/Twitter Card, `robots.txt` y `sitemap.xml`. Se despliega en Vercel usando la configuración de [`vercel.json`](vercel.json).

Para correrlo localmente:

```bash
npx serve .
```

## 🔒 Panel administrativo (`admin/`)

Herramienta privada de uso exclusivo del doctor: agenda de citas (calendario), directorio de pacientes y control financiero (ingresos/gastos/balance). No debe indexarse ni compartir dominio con la landing pública.

- **Autenticación**: Firebase Authentication (correo/contraseña), un único usuario.
- **Datos**: Firebase Firestore, bajo `doctores/{uid}/{citas|pacientes|finanzas}`.
- **Despliegue**: proyecto de Vercel independiente, con "Root Directory" apuntando a `admin/`, en un dominio propio y no listado.

Para configurar tu propia instancia, sigue los pasos de la consola de Firebase (crear proyecto, activar Authentication con correo/contraseña, crear el usuario del doctor, crear la base de datos Firestore en modo producción, y pegar las reglas de seguridad) y reemplaza los valores de ejemplo en `admin/js/firebase-config.js` con tu propio `firebaseConfig`.

## 🛠️ Stack

HTML, CSS y JavaScript vanilla (sin framework ni bundler) · [FullCalendar](https://fullcalendar.io/) para la agenda · [Firebase](https://firebase.google.com/) (Auth + Firestore) para el panel admin · [Vercel](https://vercel.com/) para el despliegue.

## 📄 Licencia

Proyecto desarrollado a medida para la Clínica Odontológica V de la Cruz. Código y contenido de uso exclusivo del cliente — ver [`LICENSE`](LICENSE).
