// ==========================================
// TaT Express - Logística y Entregas (app.js)
// ==========================================

// State Management
let currentUser = { name: 'Carlos conductor', role: 'conductor', vehicle: 'Camión NHR 3.5T' };
let activeView = 'map';
let map = null;
let userMarker = null;
let routePolyline = null;
let isClickAddStopActive = false;

// GM Secret Unlock State
let logoTapCount = 0;
let logoTapTimer = null;
let isGMUnlocked = false;
let config = {
  disableTimeBomb: false,
  disableLimits: false
};

// Application Data
let routes = [
  {
    id: 1,
    name: 'Ruta 1 - Calle 80 / Engativá',
    start: 'Bodega Principal',
    end: 'Terminal Garaje',
    active: true,
    stops: [
      { id: 101, name: 'Tienda Doña Rosa', address: 'Cra 100 #80-12', lat: 4.7110, lng: -74.1120, status: 'delivered', amount: 125000, type: 'cash' },
      { id: 102, name: 'Surtidora El Paisa', address: 'Calle 72 #90-15', lat: 4.7080, lng: -74.1050, status: 'delivered', amount: 340000, type: 'nequi' },
      { id: 103, name: 'Minimarket Los Olivos', address: 'Av 68 #75-40', lat: 4.6950, lng: -74.0950, status: 'pending', amount: 89000, type: 'cash' }
    ]
  }
];

let currentRouteId = 1;
let routeExpenses = [];

// Denominations for Cash Closing
const denominations = [
  { name: '$100.000', val: 100000 },
  { name: '$50.000', val: 50000 },
  { name: '$20.000', val: 20000 },
  { name: '$10.000', val: 10000 },
  { name: '$5.000', val: 5000 },
  { name: '$2.000', val: 2000 },
  { name: '$1.000', val: 1000 },
  { name: 'Monedas', val: 1 }
];
let denomCounts = {};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  initMap();
  renderRoutes();
  renderDenomTable();
  updateCashSummary();
  updateSupervisorStats();
});

// Map Initialization
function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  // Default center: Bogotá Colombia coordinates
  map = L.map('map', { zoomControl: false }).setView([4.7110, -74.0721], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  // User Position Marker (Simulated GPS / Guide)
  const userIcon = L.divIcon({
    className: 'custom-user-icon',
    html: '<div class="relative"><div class="user-pos-pulse"></div><div class="user-pos-marker"></div></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  userMarker = L.marker([4.7110, -74.0721], { icon: userIcon }).addTo(map).bindPopup("<b>Tu Posición Actual</b>");

  // Handle map clicks for adding stops
  map.on('click', (e) => {
    if (isClickAddStopActive) {
      addStopFromCoordinates(e.latlng.lat, e.latlng.lng);
      cancelAddStopMode();
    }
  });

  renderRouteOnMap();
}

// Secret Tap Trigger for GM Role (5 Taps on Logo)
function handleLogoClick() {
  logoTapCount++;
  clearTimeout(logoTapTimer);

  if (logoTapCount >= 5) {
    logoTapCount = 0;
    unlockGMRole();
  } else {
    logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 2000);
  }
}

function unlockGMRole() {
  isGMUnlocked = true;
  const gmNavBtn = document.getElementById('nav-btn-gm');
  if (gmNavBtn) {
    gmNavBtn.classList.remove('hidden');
    gmNavBtn.classList.add('flex');
  }
  alert("🔓 ¡Modo GM (Game Master) Desbloqueado! Ahora tienes acceso al panel de control exclusivo en la barra inferior.");
  switchView('gm');
}

// GM Toggle Functions
function toggleGMTimeBomb(checked) {
  config.disableTimeBomb = checked;
  const badge = document.getElementById('trial-timer');
  if (badge) {
    if (checked) {
      badge.innerText = "Licencia GM Ilimitada";
    } else {
      badge.innerText = "Licencia Demo (3d)";
    }
  }
}

function toggleGMLimits(checked) {
  config.disableLimits = checked;
  alert(checked ? "Limitadores de Ruta/Paradas DESACTIVADOS." : "Limitadores ACTIVADOS (5 rutas max, 30 paradas/ruta).");
}

// View Switching Logic
function switchView(viewName) {
  activeView = viewName;
  ['map', 'routes', 'cash', 'supervisor', 'gm'].forEach(v => {
    const viewEl = document.getElementById(`view-${v}`);
    const btnEl = document.getElementById(`nav-btn-${v}`);
    if (viewEl) viewEl.classList.add('hidden');
    if (btnEl) {
      btnEl.classList.remove('text-blue-400', 'text-purple-400');
      btnEl.classList.add('text-slate-400');
    }
  });

  const currentViewEl = document.getElementById(`view-${viewName}`);
  if (currentViewEl) currentViewEl.classList.remove('hidden');

  const currentBtn = document.getElementById(`nav-btn-${viewName}`);
  if (currentBtn) {
    currentBtn.classList.remove('text-slate-400');
    currentBtn.classList.add(viewName === 'gm' ? 'text-purple-400' : 'text-blue-400');
  }

  if (viewName === 'map' && map) {
    setTimeout(() => map.invalidateSize(), 200);
  }
}

// Render Polyline & Markers on Map
function renderRouteOnMap() {
  if (!map) return;
  const currentRoute = routes.find(r => r.id === currentRouteId);
  if (!currentRoute) return;

  if (routePolyline) map.removeLayer(routePolyline);

  const coords = [];
  currentRoute.stops.forEach((stop, index) => {
    coords.push([stop.lat, stop.lng]);
    const isDelivered = stop.status === 'delivered';
    const markerColor = isDelivered ? '#10b981' : '#f59e0b';
    
    const stopIcon = L.divIcon({
      className: 'custom-stop-icon',
      html: `<div style="background-color:${markerColor}; width:24px; height:24px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.4);">${index + 1}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(map);
    marker.bindPopup(`
      <div class="p-1 text-slate-800">
        <h4 class="font-bold text-sm">${stop.name}</h4>
        <p class="text-xs text-slate-600">${stop.address}</p>
        <p class="text-xs font-semibold mt-1">Monto: $${stop.amount.toLocaleString()} (${stop.type.toUpperCase()})</p>
        <button onclick="toggleStopStatus(${stop.id})" class="mt-2 w-full bg-blue-600 text-white text-xs py-1 rounded">
          ${isDelivered ? 'Marcar Pendiente' : 'Marcar Entregado'}
        </button>
      </div>
    `);
  });

  if (coords.length > 1) {
    routePolyline = L.polyline(coords, { color: '#3b82f6', weight: 4, dashArray: '6, 8' }).addTo(map);
    map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });
  }
}

// Toggle stop status between delivered and pending
function toggleStopStatus(stopId) {
  const currentRoute = routes.find(r => r.id === currentRouteId);
  if (!currentRoute) return;
  const stop = currentRoute.stops.find(s => s.id === stopId);
  if (stop) {
    stop.status = stop.status === 'delivered' ? 'pending' : 'delivered';
    renderRouteOnMap();
    renderRoutes();
    updateCashSummary();
    updateSupervisorStats();
  }
}

// Add Stop Manual via Map Click
function enableClickAddStop() {
  const activeRoute = routes.find(r => r.id === currentRouteId);
  if (!config.disableLimits && activeRoute && activeRoute.stops.length >= 30) {
    alert("⚠️ Límite del Modo Free alcanzado (Máximo 30 paradas por ruta).");
    return;
  }
  isClickAddStopActive = true;
  const banner = document.getElementById('add-stop-banner');
  if (banner) banner.classList.remove('hidden');
}

function cancelAddStopMode() {
  isClickAddStopActive = false;
  const banner = document.getElementById('add-stop-banner');
  if (banner) banner.classList.add('hidden');
}

function addStopFromCoordinates(lat, lng) {
  const activeRoute = routes.find(r => r.id === currentRouteId);
  if (!activeRoute) return;

  const stopName = prompt("Nombre del Cliente / Tienda:", "Nueva Tienda TaT");
  if (!stopName) return;

  const newStop = {
    id: Date.now(),
    name: stopName,
    address: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
    lat: lat,
    lng: lng,
    status: 'pending',
    amount: 50000,
    type: 'cash'
  };

  activeRoute.stops.push(newStop);
  renderRouteOnMap();
  renderRoutes();
  updateCashSummary();
  updateSupervisorStats();
}

// Search Location Simulation
function searchLocation() {
  const searchInput = document.getElementById('map-search-input');
  if (!searchInput) return;
  const query = searchInput.value;
  if (!query) return;
  alert(`Buscando dirección: "${query}". (Simulado: centrado en punto de entrega)`);
  if (map) {
    map.setView([4.7150, -74.0750], 15);
  }
}

// Recenter map
function recenterToUser() {
  if (userMarker && map) {
    map.setView(userMarker.getLatLng(), 15);
  }
}

// Routes List Rendering
function renderRoutes() {
  const container = document.getElementById('routes-list');
  if (!container) return;
  container.innerHTML = '';

  routes.forEach(route => {
    const delivered = route.stops.filter(s => s.status === 'delivered').length;
    const total = route.stops.length;

    const card = document.createElement('div');
    card.className = `p-4 rounded-2xl border transition-all ${route.id === currentRouteId ? 'bg-slate-800 border-blue-500/80 shadow-lg' : 'bg-slate-800/40 border-slate-700'}`;
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-bold text-white text-sm">${route.name}</h3>
          <p class="text-xs text-slate-400">Inicio: ${route.start} ➔ Fin: ${route.end}</p>
        </div>
        <button onclick="selectRoute(${route.id})" class="px-3 py-1.5 rounded-xl text-xs font-semibold ${route.id === currentRouteId ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}">
          ${route.id === currentRouteId ? 'Ruta Activa' : 'Seleccionar'}
        </button>
      </div>
      <div class="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>Paradas: ${delivered}/${total} entregadas</span>
        <span class="text-blue-400 font-semibold">${total > 0 ? Math.round((delivered/total)*100) : 0}% completado</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function selectRoute(id) {
  currentRouteId = id;
  renderRoutes();
  renderRouteOnMap();
}

// Route Creation Modal Handlers
function openCreateRouteModal() {
  if (!config.disableLimits && routes.length >= 5) {
    alert("⚠️ Límite del Modo Free alcanzado (Máximo 5 rutas).");
    return;
  }
  const modal = document.getElementById('modal-create-route');
  if (modal) modal.classList.remove('hidden');
}

function closeCreateRouteModal() {
  const modal = document.getElementById('modal-create-route');
  if (modal) modal.classList.add('hidden');
}

function confirmCreateRoute() {
  const nameInput = document.getElementById('route-name-input');
  const startInput = document.getElementById('route-start-input');
  const endInput = document.getElementById('route-end-input');

  const name = nameInput && nameInput.value ? nameInput.value : 'Nueva Ruta TaT';
  const start = startInput && startInput.value ? startInput.value : 'Bodega';
  const end = endInput && endInput.value ? endInput.value : 'Garaje';

  const newRoute = {
    id: Date.now(),
    name: name,
    start: start,
    end: end,
    active: true,
    stops: []
  };

  routes.push(newRoute);
  currentRouteId = newRoute.id;
  closeCreateRouteModal();
  renderRoutes();
  switchView('map');
}

// Cash Closing & Summary Logic
function renderDenomTable() {
  const tbody = document.getElementById('denom-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  denominations.forEach((d, idx) => {
    denomCounts[d.name] = denomCounts[d.name] || 0;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="p-2 font-medium">${d.name}</td>
      <td class="p-2 text-center">
        <input type="number" min="0" value="${denomCounts[d.name]}" onchange="updateDenomCount('${d.name}', this.value)" class="w-16 bg-slate-900 border border-slate-700 text-center text-xs py-1 rounded text-white focus:outline-none focus:border-emerald-500">
      </td>
      <td class="p-2 text-right font-semibold text-emerald-400" id="subtotal-${idx}">$${(denomCounts[d.name] * d.val).toLocaleString()}</td>
    `;
    tbody.appendChild(row);
  });
}

function updateDenomCount(name, val) {
  denomCounts[name] = parseInt(val) || 0;
  let total = 0;
  denominations.forEach((d, idx) => {
    const sub = (denomCounts[d.name] || 0) * d.val;
    total += sub;
    const subEl = document.getElementById(`subtotal-${idx}`);
    if (subEl) subEl.innerText = `$${sub.toLocaleString()}`;
  });
  const totalEl = document.getElementById('denom-total');
  if (totalEl) totalEl.innerText = `$${total.toLocaleString()}`;
}

function updateCashSummary() {
  const activeRoute = routes.find(r => r.id === currentRouteId);
  if (!activeRoute) return;

  const visited = activeRoute.stops.filter(s => s.status === 'delivered');
  let cashTotal = 0;
  let transferTotal = 0;

  visited.forEach(s => {
    if (s.type === 'cash') cashTotal += s.amount;
    else transferTotal += s.amount;
  });

  const expenseTotal = routeExpenses.reduce((a, b) => a + b.amount, 0);

  const statVisited = document.getElementById('stat-visited');
  const statCash = document.getElementById('stat-cash');
  const statTransfers = document.getElementById('stat-transfers');
  const statExpenses = document.getElementById('stat-expenses');

  if (statVisited) statVisited.innerText = `${visited.length}/${activeRoute.stops.length}`;
  if (statCash) statCash.innerText = `$${cashTotal.toLocaleString()}`;
  if (statTransfers) statTransfers.innerText = `$${transferTotal.toLocaleString()}`;
  if (statExpenses) statExpenses.innerText = `$${expenseTotal.toLocaleString()}`;
}

function addExpense() {
  const descInput = document.getElementById('expense-desc');
  const amtInput = document.getElementById('expense-amount');
  if (!descInput || !amtInput) return;

  const desc = descInput.value;
  const amt = parseFloat(amtInput.value);
  if (!desc || isNaN(amt)) return;

  routeExpenses.push({ desc, amount: amt });
  descInput.value = '';
  amtInput.value = '';
  updateCashSummary();
  alert('Gasto de ruta registrado.');
}

function finalizeCashClosing() {
  alert("✅ Arqueo y cierre de caja procesado con éxito. Reporte enviado al Supervisor.");
}

// Supervisor Dashboard Rendering
function updateSupervisorStats() {
  const activeRouteCount = routes.length;
  let delivered = 0;
  let pending = 0;
  let totalMoney = 0;

  routes.forEach(r => {
    r.stops.forEach(s => {
      if (s.status === 'delivered') {
        delivered++;
        totalMoney += s.amount;
      } else {
        pending++;
      }
    });
  });

  const supActiveRoutes = document.getElementById('sup-active-routes');
  const supDelivered = document.getElementById('sup-delivered');
  const supPendingRejected = document.getElementById('sup-pending-rejected');
  const supTotalMoney = document.getElementById('sup-total-money');

  if (supActiveRoutes) supActiveRoutes.innerText = activeRouteCount;
  if (supDelivered) supDelivered.innerText = delivered;
  if (supPendingRejected) supPendingRejected.innerText = `${pending} / 0`;
  if (supTotalMoney) supTotalMoney.innerText = `$${totalMoney.toLocaleString()}`;

  // Drivers Fleet Card Rendering
  const driversContainer = document.getElementById('supervisor-drivers-list');
  if (driversContainer) {
    driversContainer.innerHTML = `
      <div class="bg-slate-900 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-600/20 text-blue-400 rounded-lg"><i data-lucide="user" class="w-5 h-5"></i></div>
          <div>
            <h4 class="font-bold text-white text-xs">${currentUser.name}</h4>
            <p class="text-[10px] text-slate-400">Vehículo: ${currentUser.vehicle}</p>
            <p class="text-[10px] text-emerald-400">Ruta: Ruta 1 - Calle 80 (En tránsito)</p>
          </div>
        </div>
        <span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px]">Activo GPS</span>
      </div>
    `;
  }
}

// Emergency Trigger Button
function triggerEmergency() {
  alert("🚨 ALERTA DE EMERGENCIA ENVIADA AL SUPERVISOR.\nUbicación GPS transmitida a central.");
}

// Modal & Auth Handlers
function toggleAuthModal() {
  const modal = document.getElementById('modal-auth');
  if (modal) modal.classList.toggle('hidden');
}

function login() {
  const usernameInput = document.getElementById('login-username');
  const roleInput = document.getElementById('login-role');
  const vehicleInput = document.getElementById('login-vehicle');

  const username = usernameInput ? usernameInput.value : 'conductor1';
  const role = roleInput ? roleInput.value : 'conductor';
  const vehicle = vehicleInput ? vehicleInput.value : 'Camión NHR 3.5T';

  currentUser = { name: username, role: role, vehicle: vehicle };

  const roleBadge = document.getElementById('role-badge');
  if (roleBadge) roleBadge.innerText = role === 'supervisor' ? 'Supervisor' : 'Conductor';
  toggleAuthModal();

  if (role === 'supervisor') {
    switchView('supervisor');
  } else {
    switchView('map');
  }
}
