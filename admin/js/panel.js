import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
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
let editandoCitaId = null; // Si tiene valor, formCita actualiza esa cita en vez de crear una nueva
let resumenChart = null;

// Colecciones de Firestore del doctor autenticado (se asignan al iniciar sesión)
let citasCollection = null;
let pacientesCollection = null;
let finanzasCollection = null;

// Fecha en formato YYYY-MM-DD usando el huso horario local (evita el corrimiento
// de día que causa toISOString(), que convierte a UTC).
function fechaLocalISO(d = new Date()) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ----- SELECT PERSONALIZADO -----
// Envuelve cada <select> real (oculto pero funcional) con un trigger + panel
// propios, para que el menú desplegado se vea igual que el resto del panel
// en vez del estilo nativo del navegador. El <select> real sigue siendo la
// fuente de verdad: todo el código que lee/asigna su .value sigue funcionando.
const SELECTS_PERSONALIZADOS = ['citaTratamiento', 'citaHora', 'finTipo', 'finCitaOrigen', 'finTratamiento', 'pacTratamiento', 'pacEstado', 'pacPacienteOrigen'];

function construirSelectPersonalizado(id) {
    const select = document.getElementById(id);
    if (!select) return;

    select.style.display = 'none';

    const trigger = document.createElement('div');
    trigger.className = 'login-input custom-select-trigger';
    trigger.id = 'trigger-' + id;
    trigger.innerHTML = '<span class="csel-label"></span><svg class="csel-arrow" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>';

    const panel = document.createElement('div');
    panel.className = 'custom-select-panel';
    panel.id = 'panel-' + id;
    trigger.appendChild(panel);

    select.insertAdjacentElement('afterend', trigger);

    trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        togglePanelPersonalizado(id);
    });

    sincronizarTriggerSelect(id);
}

function sincronizarTriggerSelect(id) {
    const select = document.getElementById(id);
    const trigger = document.getElementById('trigger-' + id);
    const panel = document.getElementById('panel-' + id);
    if (!select || !trigger || !panel) return;

    panel.innerHTML = '';
    Array.from(select.options).forEach(opt => {
        const item = document.createElement('div');
        item.className = 'custom-select-option' + (opt.disabled ? ' disabled' : '') + (opt.value === select.value ? ' selected' : '');
        item.textContent = opt.textContent;
        if (!opt.disabled) {
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                select.value = opt.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                sincronizarTriggerSelect(id);
                cerrarTodosLosPaneles();
            });
        }
        panel.appendChild(item);
    });

    const seleccionada = select.options[select.selectedIndex];
    trigger.querySelector('.csel-label').textContent = seleccionada ? seleccionada.textContent : '';
    trigger.classList.toggle('placeholder', !!(seleccionada && seleccionada.disabled));
}

function togglePanelPersonalizado(id) {
    const trigger = document.getElementById('trigger-' + id);
    const panel = document.getElementById('panel-' + id);
    if (!trigger || !panel) return;
    const yaAbierto = panel.classList.contains('open');
    cerrarTodosLosPaneles();
    if (!yaAbierto) {
        panel.classList.add('open');
        trigger.classList.add('open');
    }
}

function cerrarTodosLosPaneles() {
    document.querySelectorAll('.custom-select-panel.open').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.custom-select-trigger.open').forEach(t => t.classList.remove('open'));
}

document.addEventListener('click', cerrarTodosLosPaneles);

SELECTS_PERSONALIZADOS.forEach(construirSelectPersonalizado);

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
    });
}

function editarCita() {
    if (!citaSeleccionada) return;

    const partes = citaSeleccionada.title.split('|');
    const tratamiento = partes[0] || '';
    const nombre = partes[1] || '';
    const d = citaSeleccionada.start;
    const fechaStr = fechaLocalISO(d);
    const horaStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');

    document.getElementById('citaNombre').value = nombre;
    document.getElementById('citaTratamiento').value = tratamiento;
    document.getElementById('citaFecha').min = fechaLocalISO();
    document.getElementById('citaFecha').value = fechaStr;
    document.getElementById('citaHora').value = horaStr;
    sincronizarTriggerSelect('citaTratamiento');
    sincronizarTriggerSelect('citaHora');

    editandoCitaId = citaSeleccionada.id;
    document.querySelector('#modalCita h3').textContent = 'Editar Cita';
    document.querySelector('#formCita .btn-submit').textContent = 'Actualizar Cita';

    document.getElementById('modalVerCita').style.display = 'none';
    document.getElementById('modalCita').style.display = 'flex';
}

// ----- AUTENTICACIÓN -----
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const u = document.getElementById('userVal').value;
    const p = document.getElementById('passVal').value;
    const err = document.getElementById('errorMsg');

    setPersistence(auth, browserLocalPersistence)
        .then(function () {
            return signInWithEmailAndPassword(auth, u, p);
        })
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
let abonoIdx = -1;
let drawerPacienteIdx = -1;
let citasParaAutocompletar = [];
let origenesParaAutocompletarPaciente = [];
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
    renderResumen();
}

// --- SISTEMA DE PESTAÑAS (SPA) ---
function switchTab(tabId, el) {
    const items = document.querySelectorAll('.menu-item');
    items.forEach(item => item.classList.remove('active'));
    el.classList.add('active');

    document.getElementById('panel-resumen').style.display = 'none';
    document.getElementById('panel-calendario').style.display = 'none';
    document.getElementById('panel-pacientes').style.display = 'none';
    document.getElementById('panel-finanzas').style.display = 'none';

    document.getElementById('panel-' + tabId).style.display = 'flex';

    if (tabId === 'resumen') renderResumen();
    if (tabId === 'calendario' && calendarInstance) calendarInstance.render();
    if (tabId === 'finanzas') setTimeout(initFinanzas, 100);

    toggleMobileSidebar(false); // al navegar, cierra el menú si está en modo celular/tablet
}

function toggleMobileSidebar(forzar) {
    const sidebar = document.getElementById('sidebarMenu');
    const overlay = document.getElementById('sidebarOverlay');
    const abrir = typeof forzar === 'boolean' ? forzar : !sidebar.classList.contains('mobile-open');

    sidebar.classList.toggle('mobile-open', abrir);
    overlay.classList.toggle('active', abrir);
}

// --- SISTEMA DE RESUMEN (DASHBOARD) ---
function mesActualStr(fecha = new Date()) {
    return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
}

function renderResumen() {
    const hoy = new Date();
    const hoyStr = fechaLocalISO(hoy);
    const mesActual = mesActualStr(hoy);

    const fechaEl = document.getElementById('resumenFecha');
    if (fechaEl) {
        const texto = hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        fechaEl.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    // Citas de hoy y próximas citas (a partir del calendario ya cargado)
    const eventos = calendarInstance ? calendarInstance.getEvents() : [];
    const citasHoy = eventos.filter(e => e.start && fechaLocalISO(e.start) === hoyStr);
    document.getElementById('resumenCitasHoy').textContent = citasHoy.length;

    // Citas de la semana actual (lunes a domingo)
    const diaSemana = hoy.getDay(); // 0=domingo ... 6=sábado
    const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + offsetLunes);
    const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6, 23, 59, 59);
    const citasSemana = eventos.filter(e => e.start && e.start >= lunes && e.start <= domingo);
    document.getElementById('resumenCitasSemana').textContent = citasSemana.length;

    const proximas = eventos
        .filter(e => e.start && e.start >= hoy)
        .sort((a, b) => a.start - b.start)
        .slice(0, 5);

    const listaProximas = document.getElementById('resumenProximasCitas');
    if (proximas.length === 0) {
        listaProximas.innerHTML = '<li class="history-item"><span style="font-size: 14px; color: var(--text-muted);">Sin citas próximas</span></li>';
    } else {
        listaProximas.innerHTML = proximas.map(e => {
            const partes = e.title.split('|');
            const tratamiento = partes[0] || '';
            const nombre = partes[1] || tratamiento;
            const fechaHora = e.start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + ' · ' + e.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            return `<li class="history-item">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-size:14px; font-weight:500;">${nombre}</span>
                    <span class="history-date">${tratamiento}</span>
                </div>
                <span class="history-amount">${fechaHora}</span>
            </li>`;
        }).join('');
    }

    // Ingresos / Gastos / Balance del mes actual
    const registrosMes = finanzasPacientesStore.filter(f => f.fecha && f.fecha.startsWith(mesActual));
    const ingresosMes = registrosMes.filter(f => (f.tipo || 'ingreso') === 'ingreso').reduce((sum, f) => sum + (f.pago || 0), 0);
    const gastosMes = registrosMes.filter(f => f.tipo === 'gasto').reduce((sum, f) => sum + (f.precio || 0), 0);
    const balanceMes = ingresosMes - gastosMes;

    document.getElementById('resumenBalanceMes').innerHTML = formatSoles(balanceMes);
    document.getElementById('resumenBalanceMes').className = 'metric-value' + (balanceMes >= 0 ? ' positive' : ' negative');

    renderChartResumen();
}

function renderChartResumen() {
    const canvas = document.getElementById('chartResumen');
    if (!canvas || typeof Chart === 'undefined') return;

    // Últimos 6 meses (incluyendo el actual)
    const meses = [];
    const base = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
        meses.push({ key: mesActualStr(d), label: d.toLocaleDateString('es-ES', { month: 'short' }) });
    }

    const ingresosPorMes = meses.map(m =>
        finanzasPacientesStore
            .filter(f => (f.tipo || 'ingreso') === 'ingreso' && f.fecha && f.fecha.startsWith(m.key))
            .reduce((sum, f) => sum + (f.pago || 0), 0)
    );
    const gastosPorMes = meses.map(m =>
        finanzasPacientesStore
            .filter(f => f.tipo === 'gasto' && f.fecha && f.fecha.startsWith(m.key))
            .reduce((sum, f) => sum + (f.precio || 0), 0)
    );

    if (resumenChart) {
        resumenChart.destroy();
    }

    resumenChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: meses.map(m => m.label.charAt(0).toUpperCase() + m.label.slice(1)),
            datasets: [
                {
                    label: 'Ingresos',
                    data: ingresosPorMes,
                    backgroundColor: '#10b981',
                    borderRadius: 6
                },
                {
                    label: 'Gastos',
                    data: gastosPorMes,
                    backgroundColor: '#ef4444',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: (value) => 'S/ ' + value } }
            }
        }
    });
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

    const searchTerm = document.getElementById('searchFinanza')?.value || '';
    const selectedMonth = document.getElementById('filterMonth')?.value || '';
    let subtitulo = 'Todo el historial';
    if (selectedMonth) {
        const [y, m] = selectedMonth.split('-');
        const nombreMes = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        subtitulo = 'Filtro: ' + nombreMes;
    } else if (searchTerm) {
        subtitulo = 'Filtro: búsqueda activa';
    }
    document.getElementById('metricIngresosSub').textContent = subtitulo;
    document.getElementById('metricGastosSub').textContent = subtitulo;
    document.getElementById('metricBalanceSub').textContent = subtitulo;

    // Deuda total: siempre sobre TODO el historial, no se ve afectada por el filtro/búsqueda activa
    const deudaTotal = finanzasPacientesStore.reduce((sum, p) => sum + (p.deuda || 0), 0);
    document.getElementById('metricDeuda').innerHTML = formatSoles(deudaTotal);
}

// --- SISTEMA DE DIRECTORIO & FICHA ---
function openPatientProfile(idx) {
    const p = pacientesStore[idx];
    if (!p) return;

    drawerPacienteIdx = idx;
    document.getElementById('nuevaEvolucionTexto').value = '';
    cargarEvoluciones(p.id);

    document.getElementById('drawName').textContent = p.nombre;
    document.getElementById('drawStatus').textContent = 'Paciente ' + p.estado;
    document.getElementById('drawPhone').textContent = p.contacto;
    document.getElementById('drawTreat').textContent = p.tratamiento;

    let inits = p.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('drawInits').textContent = inits;

    // Historial de citas real: eventos del calendario de este paciente
    const ahora = new Date();
    const historialCitas = calendarInstance
        ? calendarInstance.getEvents()
            .filter(e => {
                const partes = e.title.split('|');
                const nombreCita = partes[1] || partes[0];
                return nombreCita === p.nombre;
            })
            .sort((a, b) => b.start - a.start)
        : [];

    let cHtml = '';
    historialCitas.forEach(e => {
        const partes = e.title.split('|');
        const tratamientoCita = partes[0] || '';
        const fechaHora = e.start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + e.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const esFutura = e.start >= ahora;
        cHtml += `<li class="history-item">
            <div style="display:flex; flex-direction:column;">
                <span style="font-size:14px; font-weight:500;">${tratamientoCita}</span>
                <span class="history-date">${fechaHora}</span>
            </div>
            <span class="history-amount" style="color: ${esFutura ? 'var(--dash-accent)' : 'var(--text-muted)'};">${esFutura ? 'Próxima' : 'Realizada'}</span>
        </li>`;
    });
    if (historialCitas.length === 0) {
        cHtml = '<li class="history-item"><span style="font-size:14px; color:var(--text-muted);">Sin citas registradas</span></li>';
    }
    document.getElementById('drawCitas').innerHTML = cHtml;

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
    drawerPacienteIdx = -1;
}

async function cargarEvoluciones(pacienteId) {
    const lista = document.getElementById('drawEvoluciones');
    lista.innerHTML = '<li class="history-item"><span style="font-size:14px; color:var(--text-muted);">Cargando...</span></li>';

    const evolucionesCollection = collection(doc(pacientesCollection, pacienteId), 'evoluciones');
    const snap = await getDocs(evolucionesCollection);
    const evoluciones = snap.docs
        .map(d => Object.assign({ id: d.id }, d.data()))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (evoluciones.length === 0) {
        lista.innerHTML = '<li class="history-item"><span style="font-size:14px; color:var(--text-muted);">Sin notas de evolución todavía</span></li>';
        return;
    }

    lista.innerHTML = evoluciones.map(ev => `<li class="history-item" style="align-items: flex-start;">
        <div style="display:flex; flex-direction:column; gap: 4px;">
            <span style="font-size:14px; font-weight:500; white-space: pre-wrap;">${ev.texto}</span>
            <span class="history-date">${ev.fecha}</span>
        </div>
    </li>`).join('');
}

async function guardarNotaEvolucion() {
    if (drawerPacienteIdx === -1) return;
    const paciente = pacientesStore[drawerPacienteIdx];
    if (!paciente) return;

    const textarea = document.getElementById('nuevaEvolucionTexto');
    const texto = textarea.value.trim();
    if (!texto) {
        alert('Escribe una nota antes de guardar.');
        return;
    }

    const evolucionesCollection = collection(doc(pacientesCollection, paciente.id), 'evoluciones');
    await addDoc(evolucionesCollection, { texto, fecha: fechaLocalISO() });

    textarea.value = '';
    cargarEvoluciones(paciente.id);
}

function initCalendario() {
    if (calendarInstance) {
        calendarInstance.render();
        return;
    }

    const calEl = document.getElementById('calendar');
    calendarInstance = new FullCalendar.Calendar(calEl, {
        locale: 'es',
        initialView: 'timeGridDay',
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
}

function abrirModal(fecha = null, hora = null) {
    const dateStr = fechaLocalISO();
    const f = document.getElementById('citaFecha');
    const h = document.getElementById('citaHora');
    const pacienteInput = document.getElementById('citaNombre');
    const tratamientoInput = document.getElementById('citaTratamiento');
    const modal = document.getElementById('modalCita');

    editandoCitaId = null;
    document.querySelector('#modalCita h3').textContent = 'Agregar Cita';
    document.querySelector('#formCita .btn-submit').textContent = 'Guardar Cita';

    f.min = dateStr;
    f.value = fecha || f.value || dateStr;
    h.value = hora || h.value || '09:00';
    pacienteInput.value = '';
    tratamientoInput.value = '';

    sincronizarTriggerSelect('citaTratamiento');
    sincronizarTriggerSelect('citaHora');

    modal.style.display = 'flex';
}

function cerrarModal() {
    const modal = document.getElementById('modalCita');
    modal.style.display = 'none';
    document.getElementById('formCita').reset();
    editandoCitaId = null;
    document.querySelector('#modalCita h3').textContent = 'Agregar Cita';
    document.querySelector('#formCita .btn-submit').textContent = 'Guardar Cita';
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

    const DURACION_DEFECTO_MS = 60 * 60 * 1000; // 1 hora, misma duración por defecto que usa el calendario
    const inicioCita = new Date(`${fecha}T${hora}:00`);
    const finCita = new Date(inicioCita.getTime() + DURACION_DEFECTO_MS);

    if (inicioCita < new Date()) {
        alert('No puedes agendar una cita en una fecha u hora que ya pasó.');
        return;
    }

    const seCruza = calendarInstance && calendarInstance.getEvents().some(ev => {
        if (editandoCitaId && ev.id === editandoCitaId) return false; // no comparar la cita contra sí misma
        if (!ev.start) return false;
        const evFin = ev.end || new Date(ev.start.getTime() + DURACION_DEFECTO_MS);
        return inicioCita < evFin && ev.start < finCita;
    });
    if (seCruza) {
        alert('Ese horario se cruza con otra cita ya agendada. Elige otra hora.');
        return;
    }

    const bg = colorPorTratamiento[tratamiento] || '#3b82f6';
    const nuevoEvento = {
        title: `${tratamiento}|${nombre}`,
        start: `${fecha}T${hora}:00`,
        backgroundColor: bg,
        borderColor: bg
    };

    if (editandoCitaId) {
        await updateDoc(doc(citasCollection, editandoCitaId), nuevoEvento);
        const eventoExistente = calendarInstance.getEventById(editandoCitaId);
        if (eventoExistente) {
            eventoExistente.setProp('title', nuevoEvento.title);
            eventoExistente.setProp('backgroundColor', bg);
            eventoExistente.setProp('borderColor', bg);
            eventoExistente.setStart(nuevoEvento.start);
        }
    } else {
        const docRef = await addDoc(citasCollection, nuevoEvento);
        if (!calendarInstance) initCalendario();
        calendarInstance.addEvent(Object.assign({ id: docRef.id }, nuevoEvento));
    }

    cerrarModal();
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

    let visibles = 0;
    pacientesStore.forEach((p, idx) => {
        if (searchTerm && !p.nombre.toLowerCase().includes(searchTerm)) return;
        visibles++;

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

    if (visibles === 0) {
        const mensaje = pacientesStore.length === 0
            ? 'Aún no tienes pacientes registrados. Usa "Registrar Paciente" para agregar el primero.'
            : 'Sin resultados para tu búsqueda.';
        tbody.innerHTML = `<tr class="empty-state-row"><td colspan="6">${mensaje}</td></tr>`;
    }
}

function abrirModalPaciente() {
    const grupoOrigen = document.getElementById('groupPacienteOrigen');
    if (editIndexPaciente === -1) {
        grupoOrigen.style.display = 'block';
        poblarSelectOrigenPaciente();
    } else {
        grupoOrigen.style.display = 'none'; // no aplica al editar un paciente ya registrado
    }
    sincronizarTriggerSelect('pacTratamiento');
    sincronizarTriggerSelect('pacEstado');
    document.getElementById('modalPaciente').style.display = 'flex';
}

function poblarSelectOrigenPaciente() {
    const select = document.getElementById('pacPacienteOrigen');
    if (!select) return;
    select.innerHTML = '<option value="">— Escribir manualmente —</option>';
    origenesParaAutocompletarPaciente = [];

    const hoy = new Date();
    const limiteAtras = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 30);
    const nombresYaRegistrados = new Set(pacientesStore.map(p => p.nombre));
    const candidatos = new Map(); // nombre -> { nombre, tratamiento, fechaOrden }

    if (calendarInstance) {
        calendarInstance.getEvents()
            .filter(e => e.start && e.start >= limiteAtras)
            .forEach(e => {
                const partes = e.title.split('|');
                const tratamiento = partes[0] || '';
                const nombre = partes[1] || tratamiento;
                if (nombresYaRegistrados.has(nombre)) return;
                const existente = candidatos.get(nombre);
                if (!existente || e.start > existente.fechaOrden) {
                    candidatos.set(nombre, { nombre, tratamiento, fechaOrden: e.start });
                }
            });
    }

    finanzasPacientesStore
        .filter(f => f.tipo !== 'gasto' && f.fecha && f.fecha >= fechaLocalISO(limiteAtras))
        .forEach(f => {
            if (nombresYaRegistrados.has(f.nombre)) return;
            const fechaOrden = new Date(f.fecha);
            const existente = candidatos.get(f.nombre);
            if (!existente || fechaOrden > existente.fechaOrden) {
                candidatos.set(f.nombre, { nombre: f.nombre, tratamiento: f.tratamiento, fechaOrden });
            }
        });

    Array.from(candidatos.values())
        .sort((a, b) => b.fechaOrden - a.fechaOrden)
        .forEach(c => {
            const idx = origenesParaAutocompletarPaciente.length;
            origenesParaAutocompletarPaciente.push({ nombre: c.nombre, tratamiento: c.tratamiento });

            const opt = document.createElement('option');
            opt.value = String(idx);
            opt.textContent = `${c.nombre} — ${c.tratamiento}`;
            select.appendChild(opt);
        });

    sincronizarTriggerSelect('pacPacienteOrigen');
}

function autocompletarPacienteDesdeOrigen() {
    const select = document.getElementById('pacPacienteOrigen');
    if (select.value === '') return;
    const origen = origenesParaAutocompletarPaciente[Number(select.value)];
    if (!origen) return;

    document.getElementById('pacNombre').value = origen.nombre;
    document.getElementById('pacTratamiento').value = origen.tratamiento;
    sincronizarTriggerSelect('pacTratamiento');
}
function cerrarModalPaciente() {
    document.getElementById('modalPaciente').style.display = 'none';
    document.getElementById('formPaciente').reset();
    editIndexPaciente = -1;
    document.querySelector('#modalPaciente h3').textContent = 'Registrar Paciente';
    document.querySelector('#formPaciente .btn-submit').textContent = 'Guardar Paciente';
}

function editarPaciente(idx) {
    const p = pacientesStore[idx];
    editIndexPaciente = idx;

    document.getElementById('pacNombre').value = p.nombre;
    document.getElementById('pacContacto').value = p.contacto;
    document.getElementById('pacTratamiento').value = p.tratamiento;
    document.getElementById('pacEstado').value = p.estado;

    document.querySelector('#modalPaciente h3').textContent = 'Editar Paciente';
    document.querySelector('#formPaciente .btn-submit').textContent = 'Actualizar Paciente';
    abrirModalPaciente();
}

function actualizarTituloFinanza() {
    if (editIndexFinanza !== -1) return; // no pisar el título mientras se edita un registro existente
    const isGasto = document.getElementById('finTipo').value === 'gasto';
    document.querySelector('#modalFinanza h3').textContent = isGasto ? 'Registrar Gasto' : 'Registrar Ingreso';
    document.querySelector('#formFinanza .btn-submit').textContent = isGasto ? 'Guardar Gasto' : 'Guardar Ingreso';
}

function poblarSelectCitas() {
    const select = document.getElementById('finCitaOrigen');
    if (!select) return;
    select.innerHTML = '<option value="">— Escribir manualmente —</option>';
    citasParaAutocompletar = [];

    if (!calendarInstance) return;
    const hoy = new Date();
    const limiteAtras = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 14);
    const limiteAdelante = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 14, 23, 59, 59);

    const citas = calendarInstance.getEvents()
        .filter(e => e.start && e.start >= limiteAtras && e.start <= limiteAdelante)
        .sort((a, b) => Math.abs(a.start - hoy) - Math.abs(b.start - hoy));

    citas.forEach(e => {
        const partes = e.title.split('|');
        const nombre = partes[1] || partes[0] || '';
        // Si el paciente ya está registrado, su diagnóstico actual manda sobre el
        // tratamiento con el que se agendó la cita (que puede haber cambiado tras
        // evaluarlo en consulta, ej. se agendó "Extracción" y terminó siendo "Blanqueamiento").
        const pacienteRegistrado = pacientesStore.find(p => p.nombre === nombre);
        const tratamiento = pacienteRegistrado ? pacienteRegistrado.tratamiento : (partes[0] || '');
        const fechaISO = fechaLocalISO(e.start);
        const fechaLegible = e.start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

        const idx = citasParaAutocompletar.length;
        citasParaAutocompletar.push({ nombre, tratamiento, fecha: fechaISO });

        const opt = document.createElement('option');
        opt.value = String(idx);
        opt.textContent = `${nombre} — ${tratamiento} (${fechaLegible})`;
        select.appendChild(opt);
    });

    sincronizarTriggerSelect('finCitaOrigen');
}

function autocompletarDesdeCita() {
    const select = document.getElementById('finCitaOrigen');
    if (select.value === '') return;
    const cita = citasParaAutocompletar[Number(select.value)];
    if (!cita) return;

    document.getElementById('finNombre').value = cita.nombre;
    document.getElementById('finTratamiento').value = cita.tratamiento;
    document.getElementById('finFecha').value = cita.fecha;
    sincronizarTriggerSelect('finTratamiento');
}

function abrirModalFinanza() {
    actualizarTituloFinanza();
    poblarSelectCitas();
    toggleFinanzaFields();
    sincronizarTriggerSelect('finTipo');
    sincronizarTriggerSelect('finTratamiento');
    if (editIndexFinanza === -1) {
        document.getElementById('finFecha').value = fechaLocalISO();
    }
    document.getElementById('modalFinanza').style.display = 'flex';
}
function cerrarModalFinanza() {
    document.getElementById('modalFinanza').style.display = 'none';
    document.getElementById('formFinanza').reset();
    document.getElementById('finTipo').value = 'ingreso';
    editIndexFinanza = -1;
    toggleFinanzaFields();
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
                    ${p.deuda > 0 ? `
                    <button class="btn-icon" onclick="abrirModalAbono(${idx})" title="Registrar pago de deuda" style="color: var(--secondary); background: none; border: none; cursor: pointer; display: flex;">
                        <svg width="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m-6-4h8m0 0l-3-3m3 3l-3 3"></path></svg>
                    </button>` : ''}
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

    if (filteredData.length === 0) {
        const mensaje = finanzasPacientesStore.length === 0
            ? 'No hay registros financieros todavía. Usa "Agregar Paciente" para crear el primero.'
            : 'Sin resultados para tu búsqueda o filtro.';
        tbody.innerHTML = `<tr class="empty-state-row"><td colspan="8">${mensaje}</td></tr>`;
    }

    actualizarMetricasFinanzas(filteredData);
}

async function borrarFinanza(idx) {
    if (!confirm("¿Estás seguro que deseas eliminar este registro financiero?")) return;
    const id = finanzasPacientesStore[idx].id;
    await deleteDoc(doc(finanzasCollection, id));
    finanzasPacientesStore.splice(idx, 1);
    renderFinanzasPacientes();
}

function abrirModalAbono(idx) {
    const p = finanzasPacientesStore[idx];
    if (!p || p.deuda <= 0) return;
    abonoIdx = idx;

    document.getElementById('abonoNombrePaciente').textContent = p.nombre;
    document.getElementById('abonoDeudaActual').textContent = formatSoles(p.deuda).replace('&nbsp;', ' ');
    document.getElementById('abonoMonto').value = '';

    document.getElementById('modalAbono').style.display = 'flex';
}

function cerrarModalAbono() {
    document.getElementById('modalAbono').style.display = 'none';
    document.getElementById('formAbono').reset();
    abonoIdx = -1;
}

document.getElementById('formAbono').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (abonoIdx === -1) return;

    const registro = finanzasPacientesStore[abonoIdx];
    const montoRaw = document.getElementById('abonoMonto').value.trim();
    const monto = parseFloat(montoRaw.replace(/[^0-9.-]+/g, ''));

    if (isNaN(monto) || monto <= 0) {
        alert('Ingresa un monto válido.');
        return;
    }
    if (monto > registro.deuda) {
        alert('El monto no puede ser mayor a la deuda pendiente (' + formatSoles(registro.deuda).replace('&nbsp;', ' ') + ').');
        return;
    }

    const nuevoPago = registro.pago + monto;
    const nuevaDeuda = Math.max(0, registro.precio - nuevoPago);
    const datosActualizados = { pago: nuevoPago, deuda: nuevaDeuda };

    await updateDoc(doc(finanzasCollection, registro.id), datosActualizados);
    finanzasPacientesStore[abonoIdx] = Object.assign({}, registro, datosActualizados);

    renderFinanzasPacientes();
    cerrarModalAbono();
});

function toggleFinanzaFields() {
    const tipo = document.getElementById('finTipo').value;
    const isGasto = tipo === 'gasto';

    document.getElementById('lblFinNombre').textContent = isGasto ? 'Nombre del Producto' : 'Nombre del Paciente';
    document.getElementById('lblFinPrecio').textContent = isGasto ? 'Precio del Producto' : 'Precio del Tratamiento';
    document.getElementById('groupFinTratamiento').style.display = isGasto ? 'none' : 'block';
    document.getElementById('groupFinPago').style.display = isGasto ? 'none' : 'block';

    document.getElementById('finTratamiento').required = !isGasto;
    document.getElementById('finPago').required = !isGasto;

    const groupCita = document.getElementById('groupFinCitaOrigen');
    if (groupCita) {
        groupCita.style.display = (!isGasto && editIndexFinanza === -1) ? 'block' : 'none';
    }

    actualizarTituloFinanza();
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

    if (tipo === 'ingreso' && !tratamiento) {
        alert('Selecciona un tratamiento.');
        return;
    }

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
        cerrarTodosLosPaneles();
        cerrarModal();
        cerrarModalPaciente();
        cerrarModalFinanza();
        cerrarModalAbono();
        cerrarModalVer();
        closePatientProfile();
    }
});

// ----- Exponer al scope global las funciones invocadas por atributos onclick/oninput/onchange del HTML -----
window.togglePass = togglePass;
window.switchTab = switchTab;
window.toggleMobileSidebar = toggleMobileSidebar;
window.salir = salir;
window.abrirModal = abrirModal;
window.abrirModalPaciente = abrirModalPaciente;
window.exportarFinanzasCSV = exportarFinanzasCSV;
window.abrirModalFinanza = abrirModalFinanza;
window.resetFinanceFilters = resetFinanceFilters;
window.sortFinanzas = sortFinanzas;
window.closePatientProfile = closePatientProfile;
window.guardarNotaEvolucion = guardarNotaEvolucion;
window.cerrarModal = cerrarModal;
window.cerrarModalPaciente = cerrarModalPaciente;
window.cerrarModalVer = cerrarModalVer;
window.eliminarCita = eliminarCita;
window.editarCita = editarCita;
window.cerrarModalFinanza = cerrarModalFinanza;
window.openPatientProfile = openPatientProfile;
window.editarPaciente = editarPaciente;
window.borrarPaciente = borrarPaciente;
window.editarFinanza = editarFinanza;
window.borrarFinanza = borrarFinanza;
window.abrirModalAbono = abrirModalAbono;
window.autocompletarDesdeCita = autocompletarDesdeCita;
window.autocompletarPacienteDesdeOrigen = autocompletarPacienteDesdeOrigen;
window.cerrarModalAbono = cerrarModalAbono;
window.renderPacientes = renderPacientes;
window.renderFinanzasPacientes = renderFinanzasPacientes;
window.toggleFinanzaFields = toggleFinanzaFields;
