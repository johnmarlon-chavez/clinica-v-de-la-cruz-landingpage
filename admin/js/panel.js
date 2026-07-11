import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let calendarInstance = null;
let citaSeleccionada = null; // Guardar la cita temporalmente

// Colecciones de Firestore del doctor autenticado (se asignan al iniciar sesión)
let citasCollection = null;
let pacientesCollection = null;
let finanzasCollection = null;

// Mapa global de colores por tratamiento para consistencia en toda la app
const colorPorTratamiento = {
    'Ortodoncia': '#8b5cf6',       // Morado Profundo
    'Limpieza': '#10b981',         // Verde Esmeralda
    'Extracción': '#f43f5e',       // Rojo/Rosa Vibrante
    'Blanqueamiento': '#f59e0b',    // Ámbar/Naranja
    'Revisión General': '#3b82f6', // Azul Clásico
    'Endodoncia': '#6366f1',       // Índigo
    'Implante': '#06b6d4',         // Cían/Turquesa
    'Carillas': '#ec4899',         // Rosa Estético
    'Prótesis': '#64748b'          // Gris Profesional
};

function cerrarModalVer() {
    document.getElementById('modalVerCita').style.display = 'none';
    citaSeleccionada = null;
}

function eliminarCita() {
    if (!citaSeleccionada) return;
    if (!confirm("¿Seguro que deseas eliminar esta cita?")) return;

    const id = citaSeleccionada.id;
    deleteDoc(doc(citasCollection, id)).then(function () {
        citaSeleccionada.remove();
        cerrarModalVer();
        actualizarResumenCitas();
    });
}

// ----- AUTENTICACIÓN -----
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const u = document.getElementById('userVal').value;
    const p = document.getElementById('passVal').value;
    const err = document.getElementById('errorMsg');

    signInWithEmailAndPassword(auth, u, p)
        .then(function () {
            err.style.opacity = '0';
        })
        .catch(function () {
            err.style.opacity = '1';
        });
});

function togglePass() {
    const p = document.getElementById('passVal');
    const eyeIcon = document.getElementById('eyeIcon');
    if (p.type === 'password') {
        p.type = 'text';
        eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>';
    } else {
        p.type = 'password';
        eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
    }
}

function salir() {
    document.getElementById('loginForm').reset();
    signOut(auth);
}

onAuthStateChanged(auth, function (user) {
    if (user) {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('dashboard-container').style.display = 'flex';
        cargarDatos(user.uid);
    } else {
        document.getElementById('dashboard-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'flex';
    }
});

// ----- CARGA DE DATOS DESDE FIRESTORE -----
let pacientesStore = [];
let editIndexPaciente = -1;
let finanzasPacientesStore = [];
let editIndexFinanza = -1;
let currentSort = { key: null, direction: 'asc' };
let eventosIniciales = [];

async function cargarDatos(uid) {
    const doctorRef = doc(db, 'doctores', uid);
    citasCollection = collection(doctorRef, 'citas');
    pacientesCollection = collection(doctorRef, 'pacientes');
    finanzasCollection = collection(doctorRef, 'finanzas');

    const [citasSnap, pacientesSnap, finanzasSnap] = await Promise.all([
        getDocs(citasCollection),
        getDocs(pacientesCollection),
        getDocs(finanzasCollection)
    ]);

    eventosIniciales = citasSnap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    pacientesStore = pacientesSnap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    finanzasPacientesStore = finanzasSnap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });

    if (calendarInstance) {
        calendarInstance.destroy();
        calendarInstance = null;
    }
    initCalendario();
    renderPacientes();
    renderFinanzasPacientes();
}

// --- SISTEMA DE PESTAÑAS (SPA) ---
function switchTab(tabId, el) {
    const items = document.querySelectorAll('.menu-item');
    items.forEach(item => item.classList.remove('active'));
    el.classList.add('active');

    document.getElementById('panel-calendario').style.display = 'none';
    document.getElementById('panel-pacientes').style.display = 'none';
    document.getElementById('panel-finanzas').style.display = 'none';

    document.getElementById('panel-' + tabId).style.display = 'flex';

    if (tabId === 'calendario' && calendarInstance) calendarInstance.render();
    if (tabId === 'finanzas') setTimeout(initFinanzas, 100);

    actualizarResumenCitas();
}

function actualizarResumenCitas() {
    if (!calendarInstance) return;
    const eventos = calendarInstance.getEvents();
    const ahoraReal = new Date();

    // Obtener la fecha que el usuario está viendo actualmente en el calendario
    const vistaFecha = calendarInstance.getDate();

    const vistaStr = vistaFecha.getFullYear() + '-' +
        String(vistaFecha.getMonth() + 1).padStart(2, '0') + '-' +
        String(vistaFecha.getDate()).padStart(2, '0');

    const hoyRealStr = ahoraReal.getFullYear() + '-' +
        String(ahoraReal.getMonth() + 1).padStart(2, '0') + '-' +
        String(ahoraReal.getDate()).padStart(2, '0');

    const esHoy = vistaStr === hoyRealStr;

    // 1. Citas del día seleccionado o visto en la navegación
    const citasDelDia = eventos.filter(e => {
        const start = e.start;
        if (!start) return false;
        const eFecha = start.getFullYear() + '-' +
            String(start.getMonth() + 1).padStart(2, '0') + '-' +
            String(start.getDate()).padStart(2, '0');
        return eFecha === vistaStr;
    });

    // Actualizar etiqueta: si es hoy "Hoy", si no, mostramos la fecha del calendario
    const labelCitas = document.querySelector('#panel-calendario .metric-card:nth-child(1) span');
    labelCitas.textContent = esHoy ? "Citas de Hoy" : "Citas del " + vistaFecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

    document.getElementById('statCitasHoy').textContent = citasDelDia.length;

    // 2. Próximo Paciente (si es hoy) o Primer Paciente (si es otro día futuro/pasado)
    const labelProx = document.querySelector('#panel-calendario .metric-card:nth-child(2) span');
    let proximas;

    if (esHoy) {
        labelProx.textContent = "Próximo Paciente";
        proximas = citasDelDia.filter(e => e.start > ahoraReal).sort((a, b) => a.start - b.start);
    } else {
        labelProx.textContent = "Primer Paciente del Día";
        proximas = [...citasDelDia].sort((a, b) => a.start - b.start);
    }

    const statNext = document.getElementById('statProximoPac');
    if (proximas.length > 0) {
        let partes = proximas[0].title.split('|');
        let nombre = partes[1] || partes[0];
        let hora = proximas[0].start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        statNext.innerHTML = `<span style="color:var(--primary)">${nombre}</span> <span style="font-size:12px; color:var(--text-muted); font-weight:400;">— ${hora}</span>`;
    } else {
        statNext.textContent = esHoy ? "Sin citas pendientes" : "Sin citas este día";
    }

    // 3. Estado de Consultorio (Solo relevante para el tiempo real de Hoy)
    const enCita = esHoy && citasDelDia.some(e => ahoraReal >= e.start && ahoraReal <= e.end);
    const dot = document.getElementById('dotEstado');
    const txt = document.getElementById('txtEstado');
    const labelEst = document.querySelector('#panel-calendario .metric-card:nth-child(3) span');

    if (enCita) {
        dot.style.background = "#ef4444"; // Rojo
        txt.textContent = "En Consulta";
        labelEst.textContent = "Estado de Consultorio";
    } else {
        dot.style.background = "var(--secondary)"; // Verde
        txt.textContent = esHoy ? "Disponible" : "N/A (Otro día)";
        labelEst.textContent = esHoy ? "Estado de Consultorio" : "Vista de Agenda";
        if (!esHoy) dot.style.background = "#cbd5e1";
    }
}

// --- SISTEMA DE FINANZAS ELITE ---
function initFinanzas() {
    renderFinanzasPacientes();
}

function actualizarMetricasFinanzas(dataToCalculate = finanzasPacientesStore) {
    const ingresosTotal = dataToCalculate.filter(p => (p.tipo || 'ingreso') === 'ingreso').reduce((sum, p) => sum + (p.pago || 0), 0);
    const gastosTotal = dataToCalculate.filter(p => p.tipo === 'gasto').reduce((sum, p) => sum + (p.precio || 0), 0);
    const balanceTotal = ingresosTotal - gastosTotal;

    document.getElementById('metricIngresos').innerHTML = formatSoles(ingresosTotal);
    document.getElementById('metricGastos').innerHTML = formatSoles(gastosTotal);
    document.getElementById('metricBalance').innerHTML = formatSoles(balanceTotal);

    const metricIngresosEl = document.getElementById('metricIngresos');
    const metricGastosEl = document.getElementById('metricGastos');
    const metricBalanceEl = document.getElementById('metricBalance');

    metricIngresosEl.className = 'metric-value positive';
    metricGastosEl.className = 'metric-value' + (gastosTotal > 0 ? ' warning' : '');
    metricBalanceEl.className = 'metric-value' + (balanceTotal >= 0 ? ' positive' : ' negative');
}

// --- SISTEMA DE DIRECTORIO & FICHA ---
function openPatientProfile(idx) {
    const p = pacientesStore[idx];
    if (!p) return;

    document.getElementById('drawName').textContent = p.nombre;
    document.getElementById('drawStatus').textContent = 'Paciente ' + p.estado;
    document.getElementById('drawPhone').textContent = p.contacto;
    document.getElementById('drawTreat').textContent = p.tratamiento;

    let inits = p.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('drawInits').textContent = inits;

    // Historial financiero real: registros de Finanzas (tipo ingreso) de este paciente
    const historial = finanzasPacientesStore
        .filter(f => f.tipo !== 'gasto' && f.nombre === p.nombre)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    let hHtml = '';
    let total = 0;
    historial.forEach(h => {
        total += h.pago || 0;
        hHtml += `<li class="history-item">
            <div style="display:flex; flex-direction:column;">
                <span style="font-size:14px; font-weight:500;">${h.tratamiento}</span>
                <span class="history-date">${h.fecha}</span>
            </div>
            <span class="history-amount">${formatSoles(h.pago)}</span>
        </li>`;
    });
    if (historial.length === 0) {
        hHtml = '<li class="history-item"><span style="font-size:14px; color:var(--text-muted);">Sin registros financieros</span></li>';
    }
    document.getElementById('drawHistory').innerHTML = hHtml;
    document.getElementById('drawTotal').innerHTML = formatSoles(total);

    document.getElementById('drawerOverlay').style.display = 'block';
    document.getElementById('patient-drawer').classList.add('active');
}

function closePatientProfile() {
    document.getElementById('drawerOverlay').style.display = 'none';
    document.getElementById('patient-drawer').classList.remove('active');
}

function initCalendario() {
    if (calendarInstance) {
        calendarInstance.render();
        return;
    }

    const calEl = document.getElementById('calendar');
    calendarInstance = new FullCalendar.Calendar(calEl, {
        locale: 'es',
        initialView: 'timeGridWeek',
        dayMaxEvents: 3, // Limita eventos por día en vista mes
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth'
        },
        buttonText: {
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día'
        },
        datesSet: function () {
            actualizarResumenCitas();
        },
        height: '100%',
        stickyHeaderDates: true,
        allDaySlot: false,
        nowIndicator: true,
        slotMinTime: "08:00:00",
        slotMaxTime: "20:00:00",
        scrollTime: "08:00:00",
        defaultTimedEventDuration: '01:00:00',
        slotDuration: '00:30:00',
        businessHours: { daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: '09:00', endTime: '19:00' },
        events: eventosIniciales,
        selectable: true,
        select: function (info) {
            const dateStr = info.startStr.split('T')[0];
            const timeStr = info.startStr.includes('T') ? info.startStr.split('T')[1].substring(0, 5) : '09:00';
            abrirModal(dateStr, timeStr);
        },
        eventClick: function (info) {
            citaSeleccionada = info.event;

            let partes = info.event.title.split('|');
            let tituloLimpio = partes.join(' - ');

            document.getElementById('verCitaTitulo').textContent = tituloLimpio;
            document.getElementById('verCitaDesc').textContent = tituloLimpio;

            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            let df = info.event.start.toLocaleDateString('es-ES', options);
            document.getElementById('verCitaFechaHora').textContent = df;

            document.getElementById('modalVerCita').style.display = 'flex';
        },
        eventMouseEnter: function (info) {
            let partes = info.event.title.split('|');
            let trat = partes[0] || '';
            let nom = partes[1] || '';
            let hora = info.event.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            let tt = document.getElementById('fast-tooltip');
            tt.innerHTML = `<strong style="color:#34d399">Tratamiento:</strong> ${trat}<br><strong style="color:#34d399">Paciente:</strong> ${nom}<br><strong style="color:#34d399">Hora:</strong> ${hora}`;
            tt.style.display = 'block';
            tt.style.left = info.jsEvent.clientX + 'px';
            tt.style.top = info.jsEvent.clientY + 'px';
        },
        eventMouseLeave: function (info) {
            document.getElementById('fast-tooltip').style.display = 'none';
        },
        eventContent: function (arg) {
            let container = document.createElement('div');
            let title = arg.event.title || '';
            let partes = title.split('|');
            let tratamiento = partes[0] || title;
            let nombre = partes[1] || '';

            // En la vista de mes (y popover) evitamos la hora para ganar espacio y limpieza
            let horaHtml = (arg.view.type !== 'dayGridMonth' && !arg.isStart) ? `<span class="ev-time">${arg.timeText}</span>` : '';

            let inner = `
                ${horaHtml}
                <span class="ev-trat" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${tratamiento}</span>
                ${nombre ? `<span class="ev-nom" style="display: block; font-size: 11px; opacity: 0.9;">${nombre}</span>` : ''}
            `;

            container.innerHTML = inner;
            container.style.whiteSpace = 'normal';
            container.style.overflow = 'hidden';
            container.style.padding = '2px';

            return { domNodes: [container] };
        }
    });
    calendarInstance.render();
    actualizarResumenCitas();
}

function abrirModal(fecha = null, hora = null) {
    const hoy = new Date();
    const dateStr = hoy.toISOString().split('T')[0];
    const f = document.getElementById('citaFecha');
    const h = document.getElementById('citaHora');
    const pacienteInput = document.getElementById('citaNombre');
    const tratamientoInput = document.getElementById('citaTratamiento');
    const modal = document.getElementById('modalCita');

    f.value = fecha || f.value || dateStr;
    h.value = hora || h.value || '09:00';
    pacienteInput.value = '';
    tratamientoInput.value = '';

    modal.style.display = 'flex';
}

function cerrarModal() {
    const modal = document.getElementById('modalCita');
    modal.style.display = 'none';
    document.getElementById('formCita').reset();
}

document.getElementById('formCita').addEventListener('submit', async function (e) {
    e.preventDefault();
    const nombre = document.getElementById('citaNombre').value.trim();
    const tratamiento = document.getElementById('citaTratamiento').value;
    const fecha = document.getElementById('citaFecha').value;
    const hora = document.getElementById('citaHora').value;

    if (!nombre || !tratamiento || !fecha || !hora) {
        alert('Por favor completa todos los campos antes de guardar la cita.');
        return;
    }

    const bg = colorPorTratamiento[tratamiento] || '#3b82f6';
    const nuevoEvento = {
        title: `${tratamiento}|${nombre}`,
        start: `${fecha}T${hora}:00`,
        backgroundColor: bg,
        borderColor: bg
    };

    const docRef = await addDoc(citasCollection, nuevoEvento);

    if (!calendarInstance) initCalendario();
    calendarInstance.addEvent(Object.assign({ id: docRef.id }, nuevoEvento));

    cerrarModal();
    actualizarResumenCitas();
});

// ----- SISTEMA DE DIRECTORIO DE PACIENTES -----
function renderPacientes() {
    let tbody = document.getElementById('tablaPacientes');
    if (!tbody) return;
    tbody.innerHTML = ''; // Limpiar tabla

    const searchTerm = document.getElementById('searchPaciente')?.value.toLowerCase() || '';

    // Métricas dinámicas
    document.getElementById('pacTotal').textContent = pacientesStore.length;
    document.getElementById('pacActivos').textContent = pacientesStore.filter(p => p.estado === 'Activo').length;
    document.getElementById('pacAltas').textContent = pacientesStore.filter(p => p.estado === 'Alta').length;

    pacientesStore.forEach((p, idx) => {
        if (searchTerm && !p.nombre.toLowerCase().includes(searchTerm)) return;

        let badgeClass = p.estado === 'Activo' ? 'badge-success' : (p.estado === 'Pendiente' ? 'badge-warning' : 'badge-info');
        if (p.estado === 'Alta') badgeClass = 'badge-info';

        // Extraer iniciales (Ej: Juan Perez -> JP)
        let p_arr = p.nombre.split(' ');
        let inits = (p_arr[0] ? p_arr[0][0] : '') + (p_arr[1] ? p_arr[1][0] : '');
        if (inits === '') inits = 'XX';

        const pColor = colorPorTratamiento[p.tratamiento] || '#64748b';

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td onclick="openPatientProfile(${idx})">
                <div class="patient-info">
                    <div class="patient-avatar" style="background: ${pColor};">${inits.toUpperCase()}</div>
                    <div style="font-weight: 500;">${p.nombre}</div>
                </div>
            </td>
            <td style="color: var(--text-muted);">${p.contacto}</td>
            <td>${p.tratamiento}</td>
            <td>${p.fecha}</td>
            <td><span class="badge ${badgeClass}">${p.estado}</span></td>
            <td onclick="event.stopPropagation()">
                <div style="display: flex; gap: 10px;">
                    <button class="btn-icon" onclick="editarPaciente(${idx})" title="Editar paciente" style="color: var(--dash-accent); background: none; border: none; cursor: pointer;">
                        <svg width="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button class="btn-icon" onclick="borrarPaciente(${idx})" title="Eliminar paciente" style="color:#ef4444; background: none; border: none; cursor: pointer;">
                        <svg width="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalPaciente() { document.getElementById('modalPaciente').style.display = 'flex'; }
function cerrarModalPaciente() {
    document.getElementById('modalPaciente').style.display = 'none';
    document.getElementById('formPaciente').reset();
    editIndexPaciente = -1;
    document.querySelector('#modalPaciente h3').textContent = 'Registrar Paciente';
}

function editarPaciente(idx) {
    const p = pacientesStore[idx];
    editIndexPaciente = idx;

    document.getElementById('pacNombre').value = p.nombre;
    document.getElementById('pacContacto').value = p.contacto;
    document.getElementById('pacTratamiento').value = p.tratamiento;
    document.getElementById('pacEstado').value = p.estado;

    document.querySelector('#modalPaciente h3').textContent = 'Editar Datos de Paciente';
    abrirModalPaciente();
}

function abrirModalFinanza() { document.getElementById('modalFinanza').style.display = 'flex'; }
function cerrarModalFinanza() {
    document.getElementById('modalFinanza').style.display = 'none';
    document.getElementById('formFinanza').reset();
    document.getElementById('finTipo').value = 'ingreso';
    toggleFinanzaFields();
    editIndexFinanza = -1;
    document.querySelector('#modalFinanza h3').textContent = 'Agregar Paciente';
    document.querySelector('#formFinanza .btn-submit').textContent = 'Guardar Paciente';
}

document.getElementById('formPaciente').addEventListener('submit', async function (e) {
    e.preventDefault();
    const datosPaciente = {
        nombre: document.getElementById('pacNombre').value,
        contacto: document.getElementById('pacContacto').value,
        tratamiento: document.getElementById('pacTratamiento').value,
        estado: document.getElementById('pacEstado').value,
        fecha: editIndexPaciente === -1
            ? new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
            : pacientesStore[editIndexPaciente].fecha
    };

    if (editIndexPaciente === -1) {
        const docRef = await addDoc(pacientesCollection, datosPaciente);
        pacientesStore.push(Object.assign({ id: docRef.id }, datosPaciente));
    } else {
        const id = pacientesStore[editIndexPaciente].id;
        await updateDoc(doc(pacientesCollection, id), datosPaciente);
        pacientesStore[editIndexPaciente] = Object.assign({ id: id }, datosPaciente);
        editIndexPaciente = -1;
    }

    renderPacientes();
    cerrarModalPaciente();
});

async function borrarPaciente(idx) {
    if (!confirm("¿Estás seguro que deseas eliminar a este paciente del directorio?")) return;
    const id = pacientesStore[idx].id;
    await deleteDoc(doc(pacientesCollection, id));
    pacientesStore.splice(idx, 1);
    renderPacientes();
}

// --- SISTEMA FINANCIERO DE PACIENTES ---
function sortFinanzas(key) {
    let direction = 'asc';
    if (currentSort.key === key && currentSort.direction === 'asc') {
        direction = 'desc';
    }
    currentSort = { key, direction };

    finanzasPacientesStore.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        // Lógica especial para la columna de tratamiento/gasto
        if (key === 'tratamiento') {
            valA = a.tipo === 'gasto' ? 'GASTO' : a.tratamiento;
            valB = b.tipo === 'gasto' ? 'GASTO' : b.tratamiento;
        }

        if (typeof valA === 'string') {
            return direction === 'asc'
                ? valA.localeCompare(valB)
                : valB.localeCompare(valA);
        } else {
            return direction === 'asc' ? valA - valB : valB - valA;
        }
    });

    renderFinanzasPacientes();
}

function formatSoles(value) {
    return 'S/&nbsp;' + Number(value).toFixed(2);
}

function resetFinanceFilters() {
    const searchInput = document.getElementById('searchFinanza');
    const monthInput = document.getElementById('filterMonth');
    if (searchInput) searchInput.value = '';
    if (monthInput) monthInput.value = '';
    renderFinanzasPacientes();
}

function renderFinanzasPacientes() {
    const tbody = document.getElementById('finanzasPacientesTabla');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = document.getElementById('searchFinanza')?.value.toLowerCase() || '';
    const selectedMonth = document.getElementById('filterMonth')?.value || '';

    const clearBtn = document.getElementById('btnClearSearch');
    if (clearBtn) clearBtn.style.display = (searchTerm || selectedMonth) ? 'flex' : 'none';

    let filteredData = [];

    finanzasPacientesStore.forEach((p, idx) => {
        const matchNombre = p.nombre.toLowerCase().includes(searchTerm);
        const matchTratamiento = p.tratamiento && p.tratamiento.toLowerCase().includes(searchTerm);
        const matchMonth = !selectedMonth || p.fecha.startsWith(selectedMonth);

        if ((searchTerm && !matchNombre && !matchTratamiento) || !matchMonth) return;

        filteredData.push(p);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600; color: var(--dash-accent); white-space: nowrap;">${p.hora}</td>
            <td>${p.nombre}</td>
            <td>${p.tipo === 'gasto' ? '<span class="badge" style="background:rgba(239, 68, 68, 0.1); color:#ef4444; border:none; padding:4px 8px;">GASTO</span>' : p.tratamiento}</td>
            <td style="white-space: nowrap;">${formatSoles(p.precio)}</td>
            <td style="white-space: nowrap; color: ${p.tipo === 'gasto' ? '#ef4444' : 'var(--secondary)'}; font-weight: 600;">${formatSoles(p.pago)}</td>
            <td style="white-space: nowrap; color: ${p.deuda > 0 ? '#ef4444' : 'var(--primary)'}; font-weight: 600;">${formatSoles(p.deuda)}</td>
            <td style="white-space: nowrap;">${p.fecha}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-icon" onclick="editarFinanza(${idx})" title="Editar" style="color: var(--dash-accent); background: none; border: none; cursor: pointer; display: flex;">
                        <svg width="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button class="btn-icon" onclick="borrarFinanza(${idx})" title="Eliminar" style="color: #ef4444; background: none; border: none; cursor: pointer; display: flex;">
                        <svg width="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    actualizarMetricasFinanzas(filteredData);
}

async function borrarFinanza(idx) {
    if (!confirm("¿Estás seguro que deseas eliminar este registro financiero?")) return;
    const id = finanzasPacientesStore[idx].id;
    await deleteDoc(doc(finanzasCollection, id));
    finanzasPacientesStore.splice(idx, 1);
    renderFinanzasPacientes();
}

function toggleFinanzaFields() {
    const tipo = document.getElementById('finTipo').value;
    const isGasto = tipo === 'gasto';

    document.getElementById('lblFinNombre').textContent = isGasto ? 'Nombre del Producto' : 'Nombre del Paciente';
    document.getElementById('lblFinPrecio').textContent = isGasto ? 'Precio del Producto' : 'Precio del Tratamiento';
    document.getElementById('groupFinTratamiento').style.display = isGasto ? 'none' : 'block';
    document.getElementById('groupFinPago').style.display = isGasto ? 'none' : 'block';

    document.getElementById('finTratamiento').required = !isGasto;
    document.getElementById('finPago').required = !isGasto;
}

function editarFinanza(idx) {
    const p = finanzasPacientesStore[idx];
    editIndexFinanza = idx;

    document.getElementById('finTipo').value = p.tipo || 'ingreso';
    toggleFinanzaFields();

    document.getElementById('finNombre').value = p.nombre;
    document.getElementById('finTratamiento').value = p.tratamiento;
    document.getElementById('finPrecio').value = p.precio;
    document.getElementById('finPago').value = p.pago;
    document.getElementById('finFecha').value = p.fecha;

    document.querySelector('#modalFinanza h3').textContent = 'Editar Registro';
    document.querySelector('#formFinanza .btn-submit').textContent = 'Actualizar Datos';
    abrirModalFinanza();
}

document.getElementById('formFinanza').addEventListener('submit', async function (e) {
    e.preventDefault();
    const tipo = document.getElementById('finTipo').value;
    const nombre = document.getElementById('finNombre').value.trim();
    const tratamiento = tipo === 'ingreso' ? document.getElementById('finTratamiento').value.trim() : 'Gasto Clínica';
    const precioRaw = document.getElementById('finPrecio').value.trim();
    const fecha = document.getElementById('finFecha').value;

    const precio = parseFloat(precioRaw.replace(/[^0-9.-]+/g, ''));
    // Si es gasto, el pago es igual al precio (salida de dinero completa)
    const pagoRaw = tipo === 'ingreso' ? document.getElementById('finPago').value.trim() : precio.toString();

    let horaRegistro;
    if (editIndexFinanza === -1) {
        const ahora = new Date();
        horaRegistro = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } else {
        // Mantiene la hora original si solo se están editando otros datos
        horaRegistro = finanzasPacientesStore[editIndexFinanza].hora;
    }

    const pago = parseFloat(pagoRaw.replace(/[^0-9.-]+/g, ''));

    if (isNaN(precio) || isNaN(pago)) {
        alert('Ingrese valores numéricos válidos en Precio y Pagó.');
        return;
    }

    if (tipo === 'ingreso' && pago > precio) {
        alert('El monto pagado no puede ser mayor al precio del tratamiento.');
        return;
    }

    const deuda = Math.max(0, precio - pago);
    const nuevoRegistro = {
        tipo,
        nombre,
        tratamiento,
        precio,
        pago,
        deuda,
        fecha,
        hora: horaRegistro
    };

    if (editIndexFinanza === -1) {
        const docRef = await addDoc(finanzasCollection, nuevoRegistro);
        finanzasPacientesStore.push(Object.assign({ id: docRef.id }, nuevoRegistro));
    } else {
        const id = finanzasPacientesStore[editIndexFinanza].id;
        await updateDoc(doc(finanzasCollection, id), nuevoRegistro);
        finanzasPacientesStore[editIndexFinanza] = Object.assign({ id: id }, nuevoRegistro);
        editIndexFinanza = -1;
    }

    renderFinanzasPacientes();
    cerrarModalFinanza();
});

function exportarFinanzasCSV() {
    if (finanzasPacientesStore.length === 0) {
        alert("No hay datos registrados para exportar.");
        return;
    }

    const headers = ["Hora", "Paciente/Producto", "Tratamiento/Tipo", "Precio (S/)", "Pago (S/)", "Deuda (S/)", "Fecha"];
    const rows = finanzasPacientesStore.map(p => [
        p.hora,
        p.nombre,
        p.tipo === 'gasto' ? 'GASTO' : p.tratamiento,
        p.precio.toFixed(2),
        p.pago.toFixed(2),
        p.deuda.toFixed(2),
        p.fecha
    ]);

    let csvContent = "﻿"; // BOM para que Excel detecte UTF-8 (acentos y símbolos)
    csvContent += headers.join(",") + "\r\n";
    rows.forEach(row => {
        csvContent += row.map(val => `"${val}"`).join(",") + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Reporte_Finanzas_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.csv`);
    link.click();
}

// Cerrar modales y paneles con la tecla Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        cerrarModal();
        cerrarModalPaciente();
        cerrarModalFinanza();
        cerrarModalVer();
        closePatientProfile();
    }
});

// ----- Exponer al scope global las funciones invocadas por atributos onclick/oninput/onchange del HTML -----
window.togglePass = togglePass;
window.switchTab = switchTab;
window.salir = salir;
window.abrirModal = abrirModal;
window.abrirModalPaciente = abrirModalPaciente;
window.exportarFinanzasCSV = exportarFinanzasCSV;
window.abrirModalFinanza = abrirModalFinanza;
window.resetFinanceFilters = resetFinanceFilters;
window.sortFinanzas = sortFinanzas;
window.closePatientProfile = closePatientProfile;
window.cerrarModal = cerrarModal;
window.cerrarModalPaciente = cerrarModalPaciente;
window.cerrarModalVer = cerrarModalVer;
window.eliminarCita = eliminarCita;
window.cerrarModalFinanza = cerrarModalFinanza;
window.openPatientProfile = openPatientProfile;
window.editarPaciente = editarPaciente;
window.borrarPaciente = borrarPaciente;
window.editarFinanza = editarFinanza;
window.borrarFinanza = borrarFinanza;
window.renderPacientes = renderPacientes;
window.renderFinanzasPacientes = renderFinanzasPacientes;
window.toggleFinanzaFields = toggleFinanzaFields;
