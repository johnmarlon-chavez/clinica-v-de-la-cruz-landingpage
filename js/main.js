const serviciosData = {
    ortodoncia: {
        title: "Ortodoncia",
        image: "https://i.pinimg.com/736x/a0/a2/61/a0a2615eac7c8169a8f9ef0ff462a6ca.jpg",
        desc: "La ortodoncia es una especialidad que corrige la posición de los dientes y la mandíbula. Utilizamos brackets metálicos, de cerámica o alineadores invisibles (Invisalign) para lograr una sonrisa perfecta.",
        duracion: "12-24 meses dependiendo del caso",
        sesiones: "Cada 4-6 semanas",
        cuidado: "Evitar alimentos duros, mantener higiene estricta, usar retenedores"
    },
    implantes: {
        title: "Implantes Dentales",
        image: "https://i.pinimg.com/1200x/b1/b6/43/b1b643a4d70627e2ac2c78720ba75c30.jpg",
        desc: "Los implantes dentales son raíces artificiales de titanio que se insertan en el hueso mandibular para reemplazar dientes perdidos. Ofrecen una solución permanente y natural.",
        duracion: "3-6 meses incluyendo osteointegración",
        sesiones: "2-4 visitas según el caso",
        cuidado: "Higiene rigurosa, evitar tabaco, revisiones periódicas"
    },
    endodoncia: {
        title: "Endodoncia",
        image: "https://i.pinimg.com/736x/9e/21/ff/9e21ff1a058b60cb50bfd966f231a585.jpg",
        desc: "La endodoncia o tratamiento de conductos salva dientes gravemente dañados o infecciones. Eliminamos la pulpa afectada y sellamos el conducto para preservar el diente.",
        duracion: "1-2 sesiones de 60-90 minutos",
        sesiones: "1-2 visitas",
        cuidado: "Evitar masticar del lado tratado hasta colocar corona"
    },
    extraccion: {
        title: "Extracción Dental",
        image: "https://i.pinimg.com/736x/72/42/33/724233ec59310430b7860771ab7dccc0.jpg",
        desc: "La extracción dental se realiza cuando un diente no puede salvarse. Incluye extracciones simples y quirúrgicas (quistes, muelas del juicio).",
        duracion: "20-45 minutos según complejidad",
        sesiones: "1 visita",
        cuidado: "Morder gasa 30 min, no enjuagar en 24h, dieta blanda"
    },
    limpieza: {
        title: "Limpieza Dental",
        image: "https://i.pinimg.com/736x/ad/03/c2/ad03c2a8ec80bec00ad4c715348de6f1.jpg",
        desc: "La limpieza profesional (profilaxis) elimina placa, sarro y manchas. Se realiza con ultrasonido y pulido para dientes más limpios y saludables.",
        duracion: "30-45 minutos",
        sesiones: "1 visita, cada 6 meses",
        cuidado: "Cepillado regular, hilo dental"
    },
    blanqueamiento: {
        title: "Blanqueamiento Dental",
        image: "https://i.pinimg.com/736x/9e/9f/dd/9e9fdd14eb0f1c05ca6489f0711441aa.jpg",
        desc: "El blanqueamiento dental utiliza gel de peróxido con luz LED o láser para aclarar el color de los dientes varios tonos de forma segura.",
        duracion: "60-90 minutos por sesión",
        sesiones: "1-2 sesiones",
        cuidado: "Evitar alimentos pigmentados por 48h, no fumar"
    },
    carillas: {
        title: "Carillas Dentales",
        image: "https://i.pinimg.com/736x/85/98/15/8598158be6a9b74d8cd68a152a02be44.jpg",
        desc: "Las carillas son láminas delgadas de porcelana o composite que se adhieren a la superficie frontal de los dientes para corregir forma, color o posición.",
        duracion: "2-3 semanas",
        sesiones: "2-3 visitas",
        cuidado: "Evitar morder objetos duros, buena higiene"
    },
    odontopediatria: {
        title: "Odontopediatría",
        image: "https://i.pinimg.com/1200x/18/88/26/1888265f7201ab4e40ff877fd0db2d66.jpg",
        desc: "La odontopediatría trata la salud dental de niños desde los primeros dientes. Incluye preventivas, selladores, fluorización y tratamientos adaptados a niños.",
        duracion: "30-45 minutos por visita",
        sesiones: "Según necesidad, cada 6 meses",
        cuidado: "Cepillado supervisado, dieta baja en azúcar"
    },
    resinas: {
        title: "Resinas Dentales",
        image: "https://i.pinimg.com/1200x/fc/fe/27/fcfe276bf9fd1af918f70f98642c0000.jpg",
        desc: "Las resinas o empastes compuesta restauran dientes dañados por caries. Se mimetizan con el color natural del diente para un resultado estético.",
        duracion: "30-60 minutos según tamaño",
        sesiones: "1 visita por diente",
        cuidado: "Evitar alimentos muy duros, buena higiene"
    },
    coronas: {
        title: "Coronas Dentales",
        image: "https://i.pinimg.com/1200x/4c/79/a4/4c79a4eafadc7092c31ec1c4071e8c3f.jpg",
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
    document.getElementById('modal-image').src = data.image;
    document.getElementById('modal-desc').textContent = data.desc;
    
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

const galeriaSliders = document.querySelectorAll('.galeria-slider');
galeriaSliders.forEach(slider => {
    const container = slider.parentElement;
    const beforeImg = container.querySelector('.galeria-img-before');
    
    beforeImg.style.width = '50%';
    slider.style.left = '50%';
    
    slider.addEventListener('mousedown', startDrag);
    slider.addEventListener('touchstart', startDrag);
    
    function startDrag(e) {
        e.preventDefault();
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('touchend', stopDrag);
    }
    
    function drag(e) {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const percentage = Math.max(10, Math.min(90, (x / rect.width) * 100));
        
        slider.style.left = percentage + '%';
        beforeImg.style.width = percentage + '%';
    }
    
    function stopDrag() {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', stopDrag);
    }
});

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