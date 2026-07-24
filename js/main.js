const ICON_CHECK = '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>';
const ICON_BOLT = '<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>';
const ICON_SHIELD = '<path stroke-linecap="round" stroke-linejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>';
const ICON_CLOCK = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>';
const ICON_STAR = '<path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>';
const ICON_SUN = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>';
const ICON_HEART = '<path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>';

const serviciosData = {
    ortodoncia: {
        title: "Ortodoncia",
        icon: ICON_CHECK,
        color: "#8b5cf6",
        desc: "La ortodoncia es una especialidad que corrige la posición de los dientes y la mandíbula. Utilizamos brackets metálicos, de cerámica o alineadores invisibles (Invisalign) para lograr una sonrisa perfecta.",
        duracion: "12-24 meses dependiendo del caso",
        sesiones: "Cada 4-6 semanas",
        cuidado: "Evitar alimentos duros, mantener higiene estricta, usar retenedores"
    },
    implantes: {
        title: "Implantes Dentales",
        icon: ICON_BOLT,
        color: "#06b6d4",
        desc: "Los implantes dentales son raíces artificiales de titanio que se insertan en el hueso mandibular para reemplazar dientes perdidos. Ofrecen una solución permanente y natural.",
        duracion: "3-6 meses incluyendo osteointegración",
        sesiones: "2-4 visitas según el caso",
        cuidado: "Higiene rigurosa, evitar tabaco, revisiones periódicas"
    },
    endodoncia: {
        title: "Endodoncia",
        icon: ICON_SHIELD,
        color: "#6366f1",
        desc: "La endodoncia o tratamiento de conductos salva dientes gravemente dañados o infecciones. Eliminamos la pulpa afectada y sellamos el conducto para preservar el diente.",
        duracion: "1-2 sesiones de 60-90 minutos",
        sesiones: "1-2 visitas",
        cuidado: "Evitar masticar del lado tratado hasta colocar corona"
    },
    extraccion: {
        title: "Extracción Dental",
        icon: ICON_CLOCK,
        color: "#f43f5e",
        desc: "La extracción dental se realiza cuando un diente no puede salvarse. Incluye extracciones simples y quirúrgicas (quistes, muelas del juicio).",
        duracion: "20-45 minutos según complejidad",
        sesiones: "1 visita",
        cuidado: "Morder gasa 30 min, no enjuagar en 24h, dieta blanda"
    },
    limpieza: {
        title: "Limpieza Dental",
        icon: ICON_STAR,
        color: "#10b981",
        desc: "La limpieza profesional (profilaxis) elimina placa, sarro y manchas. Se realiza con ultrasonido y pulido para dientes más limpios y saludables.",
        duracion: "30-45 minutos",
        sesiones: "1 visita, cada 6 meses",
        cuidado: "Cepillado regular, hilo dental"
    },
    blanqueamiento: {
        title: "Blanqueamiento Dental",
        icon: ICON_SUN,
        color: "#f59e0b",
        desc: "El blanqueamiento dental utiliza gel de peróxido con luz LED o láser para aclarar el color de los dientes varios tonos de forma segura.",
        duracion: "60-90 minutos por sesión",
        sesiones: "1-2 sesiones",
        cuidado: "Evitar alimentos pigmentados por 48h, no fumar"
    },
    carillas: {
        title: "Carillas Dentales",
        icon: ICON_CHECK,
        color: "#ec4899",
        desc: "Las carillas son láminas delgadas de porcelana o composite que se adhieren a la superficie frontal de los dientes para corregir forma, color o posición.",
        duracion: "2-3 semanas",
        sesiones: "2-3 visitas",
        cuidado: "Evitar morder objetos duros, buena higiene"
    },
    odontopediatria: {
        title: "Odontopediatría",
        icon: ICON_HEART,
        color: "#f97316",
        desc: "La odontopediatría trata la salud dental de niños desde los primeros dientes. Incluye preventivas, selladores, fluorización y tratamientos adaptados a niños.",
        duracion: "30-45 minutos por visita",
        sesiones: "Según necesidad, cada 6 meses",
        cuidado: "Cepillado supervisado, dieta baja en azúcar"
    },
    resinas: {
        title: "Resinas Dentales",
        icon: ICON_STAR,
        color: "#14b8a6",
        desc: "Las resinas o empastes compuesta restauran dientes dañados por caries. Se mimetizan con el color natural del diente para un resultado estético.",
        duracion: "30-60 minutos según tamaño",
        sesiones: "1 visita por diente",
        cuidado: "Evitar alimentos muy duros, buena higiene"
    },
    coronas: {
        title: "Coronas Dentales",
        icon: ICON_BOLT,
        color: "#d4a574",
        desc: "Las coronas cubren dientes muy dañados o después de una endodoncia. Se fabrican en zirconia, porcelana o metal-cerámica para durabilidad y estética.",
        duracion: "2-3 semanas",
        sesiones: "2-3 visitas",
        cuidado: "Evitar mover alimentos muy duros, revisiones"
    }
};

function openModal(servicio) {
    const data = serviciosData[servicio];
    if (!data) return;

    document.getElementById('modal-title').textContent = data.title;
    document.getElementById('modal-desc').textContent = data.desc;
    document.getElementById('modal-image').style.background = `linear-gradient(135deg, ${data.color} 0%, ${data.color}cc 100%)`;
    document.getElementById('modal-icon').innerHTML = data.icon;
    document.getElementById('modal-duracion').textContent = data.duracion;
    document.getElementById('modal-sesiones').textContent = data.sesiones;
    document.getElementById('modal-cuidado').textContent = data.cuidado;

    const modal = document.getElementById('modal-servicio');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('modal-servicio');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('modal-servicio').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('modal-servicio');
        if (modal.classList.contains('active')) {
            closeModal();
        }
    }
});

function toggleMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('active');
}

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

function enviarFormulario(e) {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value;
    const servicio = document.getElementById('servicio').value;
    
    const texto = `¡Hola! Me llamo ${nombre}. Estoy interesado en el servicio de ${servicio}.`;
    const textoEncode = encodeURIComponent(texto);
    const whatsappUrl = `https://wa.me/51979062031?text=${textoEncode}`;
    
    window.open(whatsappUrl, '_blank');
    
    e.target.reset();
}