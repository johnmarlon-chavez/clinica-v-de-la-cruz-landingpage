# Especificaciones - Clínica Odontológica V de la Cruz

## 1. Project Overview
- **Nombre**: Clínica Odontológica V de la Cruz
- **Tipo**: Landing Page / Sitio Web Corporativo
- **Funcionalidad**: Presentación de servicios odontológicos, información de contacto y generación de citas
- **Target**: Pacientes potenciales que buscan servicios odontológicos de calidad

## 2. UI/UX Specification

### Layout Structure
- **Header**: Fixed navigation con logo, menú y botón de urgencias
- **Hero**: Full-width banner con contenido centrado
- **Servicios**: Grid de 4 tarjetas (2x2 en desktop, 1x4 en móvil)
- **Sobre Nosotros**: Bloque de contenido con imagen decorativa
- **Contacto**: Formulario + información de contacto
- **Footer**: 3 columnas (legal, redes, ubicación)

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Visual Design

#### Color Palette
- **Primary**: #0F172A (Slate 900 - Azul marino profundo)
- **Secondary**: #0EA5E9 (Sky 500 - Azul cielo)
- **Accent**: #DC2626 (Red 600 - Urgencias/CTA)
- **Background**: #FFFFFF (Blanco)
- **Light**: #F8FAFC (Slate 50 - Fondos suaves)
- **Text Primary**: #1E293B (Slate 800)
- **Text Secondary**: #64748B (Slate 500)

#### Typography
- **Font Family**: "DM Sans" (Google Fonts) - Moderna, limpia, profesional
- **Headings**: Bold, tracking-tight
- **Body**: Regular, line-height 1.6

#### Spacing System
- Section padding: 80px vertical (desktop), 48px (mobile)
- Container max-width: 1280px
- Card padding: 24px

#### Visual Effects
- Cards: Sutil shadow-lg en hover, transition 300ms
- Botones: Scale 1.02 en hover
- Imágenes: Border-radius 16px
- Animaciones: Fade-in suave en scroll

### Components

#### Header
- Logo: Texto "V de la Cruz" con cruz/diente pequeño
- Nav: Inicio, Servicios, Nosotros, Contacto
- Botón Urgencias: Rojo con icono de teléfono
- Mobile: Hamburger menu

#### Hero
- Background: Gradiente sutil azul con patrón geométrico
- Título: H1 grande, blanco sobre fondo oscuro
- Subtítulo: Texto explicativo
- CTA: Botón primario azul

#### Tarjetas de Servicios
- Icono (SVG)
- Título del servicio
- Descripción breve
- Hover: Elevación y borde azul

#### Sobre Nosotros
- Layout: Imagen a izquierda, texto a derecha
- Título destacado
- Texto descriptivo con checkmarks

#### Formulario de Contacto
- Campos: Nombre, Teléfono, Servicio (select), Mensaje
- Validación HTML5 básica
- Botón submit

#### WhatsApp Flotante
- Botón circular verde en bottom-right
- Icono de WhatsApp
- Fijo en viewport

## 3. Functionality Specification

### Core Features
- Navegación fluida entre secciones
- Menú responsive mobile
- Botón de WhatsApp siempre visible
- Formulario con validación
- Animaciones suaves en scroll

### Interacciones
- Smooth scroll en links de navegación
- Hover effects en tarjetas y botones
- Mobile menu toggle

## 4. Acceptance Criteria
- [ ] Header fijo con logo, nav y botón de urgencias
- [ ] Hero con gradiente y título profesional
- [ ] 4 tarjetas de servicios con iconos
- [ ] Sección sobre nosotros con diseño elegante
- [ ] Formulario de contacto funcional
- [ ] Botón WhatsApp flotante
- [ ] Footer con 3 columnas
- [ ] Totalmente responsive
- [ ] Animaciones suaves
- [ ] Código modular con comentarios