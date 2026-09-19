/**
 * TravelPilot - Interactive Trip Planner Engine with Live Leaflet Map, Transit Booking & Dynamic Disruption Assistant
 */

// =============================================================================
// 1. APPLICATION STATE
// =============================================================================

let state = {
  destination: "jaipur",
  daysCount: 3,
  totalBudget: 18000,
  selectedInterests: ["culture", "food", "nature"],
  activeDayTab: 0, // 0 for Day 1, -1 for "All Days"
  activeViewMode: "itinerary", // "itinerary" | "map" | "transit"
  itinerary: [],
  originalItineraryBackup: null,
  activeDisruption: null // "rain" | "delay" | "chill" | null
};

let mapInstance = null;
let mapMarkersGroup = null;
let mapPolylinesGroup = null;

// Day Pin Palette
const DAY_COLORS = ["#ea580c", "#4f46e5", "#059669", "#e11d48", "#d97706", "#7c3aed", "#0284c7"];

// =============================================================================
// 2. INITIALIZATION & EVENT HANDLERS
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  renderInterestChips();
  setupEventListeners();

  // Load from localStorage if present
  const saved = localStorage.getItem("travelpilot_saved_trip");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.itinerary && parsed.itinerary.length > 0) {
        state = parsed;
        syncFormWithState();
        renderDashboard();
        return;
      }
    } catch (e) {
      console.warn("Could not load saved trip:", e);
    }
  }

  generateItinerary();
});

function renderInterestChips() {
  const container = document.getElementById("interests-container");
  if (!container) return;
  container.innerHTML = "";

  INTEREST_CATEGORIES.forEach(cat => {
    const isChecked = state.selectedInterests.includes(cat.id);
    const label = document.createElement("label");
    label.className = `interest-chip ${isChecked ? 'selected' : ''}`;
    label.innerHTML = `
      <input type="checkbox" name="interest" value="${cat.id}" ${isChecked ? 'checked' : ''}>
      <span>${cat.icon}</span>
      <span>${cat.label}</span>
    `;

    label.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) {
        if (!state.selectedInterests.includes(cat.id)) state.selectedInterests.push(cat.id);
        label.classList.add("selected");
      } else {
        state.selectedInterests = state.selectedInterests.filter(id => id !== cat.id);
        label.classList.remove("selected");
      }
    });

    container.appendChild(label);
  });
}

function syncFormWithState() {
  const destSelect = document.getElementById("select-destination");
  const daysSelect = document.getElementById("input-days");
  const budgetInput = document.getElementById("input-budget");

  if (destSelect) destSelect.value = state.destination;
  if (daysSelect) daysSelect.value = String(state.daysCount);
  if (budgetInput) budgetInput.value = state.totalBudget;

  const chips = document.querySelectorAll(".interest-chip");
  chips.forEach(chip => {
    const input = chip.querySelector("input");
    if (input) {
      const isChecked = state.selectedInterests.includes(input.value);
      input.checked = isChecked;
      if (isChecked) chip.classList.add("selected");
      else chip.classList.remove("selected");
    }
  });
}

// =============================================================================
// 3. ITINERARY GENERATOR ALGORITHM
// =============================================================================

function generateItinerary() {
  const destKey = state.destination;
  const destInfo = DESTINATIONS_DATA[destKey] || DESTINATIONS_DATA.jaipur;
  const allPlaces = [...destInfo.places];

  const scoredPlaces = allPlaces.map(p => {
    let score = 0;
    if (state.selectedInterests.includes(p.category)) score += 5;
    return { ...p, score };
  });

  scoredPlaces.sort((a, b) => b.score - a.score);

  const numDays = state.daysCount;
  const days = [];
  const usedPlaceIds = new Set();

  for (let d = 1; d <= numDays; d++) {
    const dayActivities = [];
    for (const place of scoredPlaces) {
      if (dayActivities.length >= 3) break;
      if (!usedPlaceIds.has(place.id)) {
        dayActivities.push(JSON.parse(JSON.stringify(place)));
        usedPlaceIds.add(place.id);
      }
    }

    if (dayActivities.length === 0) {
      dayActivities.push({
        id: `custom-chill-${d}`,
        name: `Leisure & Local Cafe Exploration in ${destInfo.name}`,
        timeSlot: "Afternoon (02:00 PM)",
        category: "food",
        cost: 400,
        duration: "2 hours",
        description: `Stroll through the local streets, visit nearby markets, and enjoy regional delicacies.`,
        tip: "Ask your hotel host for their favorite hidden dining spot.",
        coords: destInfo.centerCoords
      });
    }

    let dayTheme = `Day ${d}: Highlights of ${destInfo.name}`;
    if (d === 1) dayTheme = `Day 1: Iconic Landmarks & First Impressions`;
    else if (d === 2) dayTheme = `Day 2: Heritage, Culture & Local Flavors`;
    else if (d === 3) dayTheme = `Day 3: Scenic Vistas & Sunset Magic`;
    else if (d === 4) dayTheme = `Day 4: Adventure & Offbeat Trails`;
    else if (d === 5) dayTheme = `Day 5: Artisan Bazaars & Wellness`;
    else if (d >= 6) dayTheme = `Day ${d}: Extended Discovery & Leisure`;

    days.push({
      dayNum: d,
      title: dayTheme,
      activities: dayActivities
    });
  }

  state.itinerary = days;
  state.originalItineraryBackup = JSON.parse(JSON.stringify(days));
  state.activeDayTab = 0;
  state.activeDisruption = null;

  saveToLocalStorage();
  renderDashboard();
  showToast("Custom Itinerary Generated!", `Crafted a personalized ${numDays}-day plan for ${destInfo.name}.`, "success");
}

// =============================================================================
// 4. RENDERING & UI SYNC
// =============================================================================

function renderDashboard() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  document.getElementById("section-dashboard").style.display = "block";

  // Banner Details
  document.getElementById("dest-title").textContent = `${destInfo.name} — ${state.daysCount} Day Adaptive Itinerary`;
  document.getElementById("dest-tagline").textContent = destInfo.tagline;
  document.getElementById("dest-state-badge").textContent = destInfo.state;
  document.getElementById("dest-time-badge").textContent = `Best Time: ${destInfo.bestTime}`;

  const highlightsContainer = document.getElementById("dest-highlights-list");
  if (highlightsContainer) {
    highlightsContainer.innerHTML = destInfo.highlights.map(h => `<span class="meta-chip">✨ ${h}</span>`).join("");
  }

  // Update Disruption Bar
  updateDisruptionBarUI();

  // Render Sub-Views
  renderDayTabs();
  renderDayContent();
  recalculateBudget();
  renderInsights();
  renderTransitView();

  // If map is currently active view, render map
  if (state.activeViewMode === "map") {
    setTimeout(initOrUpdateMap, 100);
  }
}

// Switch between Itinerary, Map, and Transit Views
function switchViewMode(mode) {
  state.activeViewMode = mode;

  const buttons = document.querySelectorAll(".view-mode-btn");
  buttons.forEach(btn => {
    if (btn.dataset.mode === mode) btn.classList.add("active");
    else btn.classList.remove("active");
  });

  const secItinerary = document.getElementById("view-section-itinerary");
  const secMap = document.getElementById("view-section-map");
  const secTransit = document.getElementById("view-section-transit");

  if (secItinerary) secItinerary.style.display = mode === "itinerary" ? "grid" : "none";
  if (secMap) secMap.style.display = mode === "map" ? "flex" : "none";
  if (secTransit) secTransit.style.display = mode === "transit" ? "flex" : "none";

  if (mode === "map") {
    setTimeout(initOrUpdateMap, 50);
  }
}

// Render Day Tabs Navigation
function renderDayTabs() {
  const tabsContainer = document.getElementById("days-nav-tabs");
  if (!tabsContainer) return;
  tabsContainer.innerHTML = "";

  const allTab = document.createElement("button");
  allTab.className = `day-tab-btn ${state.activeDayTab === -1 ? 'active' : ''}`;
  allTab.innerHTML = `
    <span class="tab-day-label">Overview</span>
    <span class="tab-day-title">All Days (${state.itinerary.length})</span>
    <span class="tab-day-cost">Full Itinerary</span>
  `;
  allTab.addEventListener("click", () => {
    state.activeDayTab = -1;
    renderDayTabs();
    renderDayContent();
    if (state.activeViewMode === "map") initOrUpdateMap();
  });
  tabsContainer.appendChild(allTab);

  state.itinerary.forEach((day, idx) => {
    const dayCost = day.activities.reduce((sum, act) => sum + (Number(act.cost) || 0), 0);
    const tabBtn = document.createElement("button");
    tabBtn.className = `day-tab-btn ${state.activeDayTab === idx ? 'active' : ''}`;
    tabBtn.innerHTML = `
      <span class="tab-day-label">Day ${day.dayNum}</span>
      <span class="tab-day-title">${day.activities.length} Stops</span>
      <span class="tab-day-cost">₹${dayCost.toLocaleString('en-IN')}</span>
    `;

    tabBtn.addEventListener("click", () => {
      state.activeDayTab = idx;
      renderDayTabs();
      renderDayContent();
      if (state.activeViewMode === "map") initOrUpdateMap();
    });

    tabsContainer.appendChild(tabBtn);
  });

  const addDayBtn = document.createElement("button");
  addDayBtn.className = "day-tab-btn";
  addDayBtn.style.borderStyle = "dashed";
  addDayBtn.innerHTML = `
    <span class="tab-day-label">Extend Trip</span>
    <span class="tab-day-title">+ Add Day</span>
    <span class="tab-day-cost">Add Day ${state.itinerary.length + 1}</span>
  `;
  addDayBtn.addEventListener("click", addNewDay);
  tabsContainer.appendChild(addDayBtn);
}

// Render Active Day Activities
function renderDayContent() {
  const container = document.getElementById("day-content-area");
  if (!container) return;
  container.innerHTML = "";

  const daysToRender = state.activeDayTab === -1 
    ? state.itinerary 
    : [state.itinerary[state.activeDayTab]].filter(Boolean);

  if (daysToRender.length === 0) {
    container.innerHTML = `<div class="day-header-card"><p>No activities scheduled for this day.</p></div>`;
    return;
  }

  daysToRender.forEach((day) => {
    const dayIndex = state.itinerary.findIndex(d => d.dayNum === day.dayNum);
    const dayCost = day.activities.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);

    const daySection = document.createElement("div");
    daySection.style.marginBottom = "24px";

    const header = document.createElement("div");
    header.className = "day-header-card";
    header.innerHTML = `
      <div class="day-title-group">
        <h3>Day ${day.dayNum}: ${day.title.replace(/^Day \d+:\s*/, '')}</h3>
        <p>${day.activities.length} activities planned · Estimated daily spend</p>
      </div>
      <div class="day-header-actions">
        <span class="day-subtotal-badge">Day Subtotal: ₹${dayCost.toLocaleString('en-IN')}</span>
        ${state.itinerary.length > 1 ? `
          <button class="btn-icon-sm delete" title="Delete this Day" onclick="deleteDay(${dayIndex})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 15px; height: 15px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        ` : ''}
      </div>
    `;
    daySection.appendChild(header);

    const actList = document.createElement("div");
    actList.className = "activities-list";
    actList.style.marginTop = "12px";

    day.activities.forEach((act, actIndex) => {
      const actCard = document.createElement("div");
      actCard.className = `activity-card ${act.category === 'transit' ? 'is-transit' : ''}`;
      actCard.draggable = true;
      actCard.dataset.dayIndex = dayIndex;
      actCard.dataset.actIndex = actIndex;

      const catClass = `cat-${act.category || 'culture'}`;
      const catLabel = getCategoryLabel(act.category);

      actCard.innerHTML = `
        <div class="drag-handle" title="Drag to Reorder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/></svg>
        </div>

        <div class="activity-main">
          <div>
            <span class="activity-badge-category ${catClass}">${catLabel}</span>
            <span class="activity-time">⏰ ${act.timeSlot}</span>
          </div>
          <h4 class="activity-name">${act.name}</h4>
          ${act.description ? `<p class="activity-desc">${act.description}</p>` : ''}
          ${act.tip ? `
            <div class="activity-tip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span><strong>Tip:</strong> ${act.tip}</span>
            </div>
          ` : ''}
        </div>

        <div class="activity-right">
          <div class="cost-input-wrap" title="Click to edit activity cost">
            <span class="cost-currency">₹</span>
            <input type="number" class="cost-field" value="${act.cost || 0}" min="0" step="50" data-day="${dayIndex}" data-act="${actIndex}">
          </div>

          <div class="activity-actions">
            <button class="btn-icon-sm" title="Move Up" onclick="moveActivity(${dayIndex}, ${actIndex}, -1)" ${actIndex === 0 ? 'disabled style="opacity:0.3;"' : ''}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="btn-icon-sm" title="Move Down" onclick="moveActivity(${dayIndex}, ${actIndex}, 1)" ${actIndex === day.activities.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button class="btn-icon-sm" title="Edit Place Details" onclick="openEditActivityModal(${dayIndex}, ${actIndex})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon-sm delete" title="Delete Activity" onclick="deleteActivity(${dayIndex}, ${actIndex})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;

      setupCardDragAndDrop(actCard, dayIndex, actIndex);

      const costInput = actCard.querySelector(".cost-field");
      costInput.addEventListener("input", (e) => {
        const newCost = Number(e.target.value) || 0;
        state.itinerary[dayIndex].activities[actIndex].cost = newCost;
        recalculateBudget();
        updateDaySubtotalBadges();
        saveToLocalStorage();
      });

      actList.appendChild(actCard);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "add-activity-btn";
    addBtn.style.marginTop = "8px";
    addBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <span>Add New Place / Activity to Day ${day.dayNum}</span>
    `;
    addBtn.addEventListener("click", () => openAddActivityModal(dayIndex));
    actList.appendChild(addBtn);

    daySection.appendChild(actList);
    container.appendChild(daySection);
  });
}

function updateDaySubtotalBadges() {
  const tabs = document.querySelectorAll(".day-tab-btn");
  state.itinerary.forEach((day, idx) => {
    const dayCost = day.activities.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
    if (tabs[idx + 1]) {
      const costSpan = tabs[idx + 1].querySelector(".tab-day-cost");
      if (costSpan) costSpan.textContent = `₹${dayCost.toLocaleString('en-IN')}`;
    }
  });

  const headerBadges = document.querySelectorAll(".day-subtotal-badge");
  headerBadges.forEach((badge, i) => {
    const targetDay = state.activeDayTab === -1 ? state.itinerary[i] : state.itinerary[state.activeDayTab];
    if (targetDay) {
      const dayCost = targetDay.activities.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
      badge.textContent = `Day Subtotal: ₹${dayCost.toLocaleString('en-IN')}`;
    }
  });
}

// =============================================================================
// 5. LIVE LEAFLET MAP VISUALIZER
// =============================================================================

function initOrUpdateMap() {
  const mapContainer = document.getElementById("travel-map-container");
  if (!mapContainer) return;

  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const center = destInfo.centerCoords || [26.9124, 75.7873];

  if (!mapInstance) {
    mapInstance = L.map('travel-map-container', {
      center: center,
      zoom: 12,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);

    mapMarkersGroup = L.layerGroup().addTo(mapInstance);
    mapPolylinesGroup = L.layerGroup().addTo(mapInstance);
  } else {
    mapInstance.setView(center, 12);
    mapMarkersGroup.clearLayers();
    mapPolylinesGroup.clearLayers();
  }

  // Determine which days to plot
  const daysToPlot = state.activeDayTab === -1
    ? state.itinerary
    : [state.itinerary[state.activeDayTab]].filter(Boolean);

  const allLatLngs = [];
  const legendContainer = document.getElementById("map-legend-pills");
  if (legendContainer) legendContainer.innerHTML = "";

  daysToPlot.forEach((day, dayIdx) => {
    const dayColor = DAY_COLORS[day.dayNum % DAY_COLORS.length] || "#ea580c";
    const dayLatLngs = [];

    // Add legend pill
    if (legendContainer) {
      const pill = document.createElement("span");
      pill.className = "map-pill-item";
      pill.style.background = `${dayColor}18`;
      pill.style.color = dayColor;
      pill.style.border = `1px solid ${dayColor}40`;
      pill.innerHTML = `● Day ${day.dayNum}: ${day.activities.length} Stops`;
      legendContainer.appendChild(pill);
    }

    day.activities.forEach((act, actIdx) => {
      // Find coords or fallback
      let coords = act.coords;
      if (!coords) {
        coords = [
          center[0] + (Math.random() - 0.5) * 0.04,
          center[1] + (Math.random() - 0.5) * 0.04
        ];
      }

      dayLatLngs.push(coords);
      allLatLngs.push(coords);

      // Custom HTML pin
      const icon = L.divIcon({
        className: 'custom-pin-wrapper',
        html: `<div class="custom-map-pin" style="background:${dayColor};">D${day.dayNum}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const popupHtml = `
        <div style="min-width:180px;">
          <div style="font-size:0.7rem; font-weight:700; color:${dayColor}; text-transform:uppercase;">Day ${day.dayNum} · Stop #${actIdx + 1}</div>
          <div style="font-weight:700; font-size:0.95rem; margin-top:2px;">${act.name}</div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:3px;">⏰ ${act.timeSlot} · ₹${act.cost}</div>
          ${act.tip ? `<div style="font-size:0.72rem; color:#d97706; margin-top:4px;">💡 ${act.tip}</div>` : ''}
          <div style="margin-top:8px;">
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.name + ' ' + destInfo.name)}" target="_blank" style="color:#ea580c; font-weight:700; font-size:0.75rem; text-decoration:none;">Open in Google Maps &rarr;</a>
          </div>
        </div>
      `;

      const marker = L.marker(coords, { icon: icon }).bindPopup(popupHtml);
      mapMarkersGroup.addLayer(marker);
    });

    // Draw route connecting lines for the day
    if (dayLatLngs.length > 1) {
      const polyline = L.polyline(dayLatLngs, {
        color: dayColor,
        weight: 3.5,
        opacity: 0.75,
        dashArray: '6, 8'
      });
      mapPolylinesGroup.addLayer(polyline);
    }
  });

  // Fit bounds to markers
  if (allLatLngs.length > 0) {
    try {
      const bounds = L.latLngBounds(allLatLngs);
      mapInstance.fitBounds(bounds, { padding: [40, 40] });
    } catch (e) {
      // Handled
    }
  }

  mapInstance.invalidateSize();
}

// =============================================================================
// 6. DYNAMIC WEATHER & DELAY DISRUPTION ASSISTANT
// =============================================================================

function applyDisruptionScenario(type) {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const plans = destInfo.contingencyPlans;
  if (!plans) return;

  state.activeDisruption = type;

  if (type === "rain" && plans.heavyRain) {
    const rainReplacements = plans.heavyRain.replacements;
    // Replace outdoor activities in Day 1 and Day 2 with indoor ones
    if (state.itinerary[0] && rainReplacements.length > 0) {
      state.itinerary[0].title = `Day 1: Rainy Day Indoor Palaces & Masterclasses`;
      state.itinerary[0].activities = JSON.parse(JSON.stringify(rainReplacements));
    }
    showToast("Monsoon Reroute Applied 🌧️", "Swapped open hills/forts for royal indoor museums, havelis, and culinary masterclasses.", "success");
  } else if (type === "delay" && plans.timeDelay) {
    // Keep only essential 2 spots
    state.itinerary.forEach(d => {
      if (d.activities.length > 2) {
        d.activities = d.activities.slice(0, 2);
      }
    });
    showToast("Express Reroute Applied ⏱️", "Condensed stops to top 2 must-visit places to absorb 2+ hours of travel delay.", "info");
  } else if (type === "chill" && plans.lowEnergy) {
    const chillSpots = plans.lowEnergy.replacements;
    if (state.itinerary[0] && chillSpots.length > 0) {
      state.itinerary[0].activities.push(JSON.parse(JSON.stringify(chillSpots[0])));
    }
    showToast("Relaxation Mode Active 😴", "Added scenic lakeside high-tea and soothing Ayurvedic wellness spots.", "success");
  } else if (type === "reset") {
    if (state.originalItineraryBackup) {
      state.itinerary = JSON.parse(JSON.stringify(state.originalItineraryBackup));
      state.activeDisruption = null;
      showToast("Route Reset", "Restored original customized itinerary.", "info");
    }
  }

  saveToLocalStorage();
  renderDashboard();
  if (state.activeViewMode === "map") initOrUpdateMap();
}

function updateDisruptionBarUI() {
  const title = document.getElementById("disruption-title");
  const desc = document.getElementById("disruption-desc");
  const icon = document.getElementById("disruption-icon");

  if (!title || !desc || !icon) return;

  if (state.activeDisruption === "rain") {
    icon.textContent = "🌧️";
    title.textContent = "Active: Monsoon / Heavy Rain Reroute";
    desc.textContent = "Outdoor viewpoints and hikes have been safely replaced with indoor heritage havelis & museums.";
  } else if (state.activeDisruption === "delay") {
    icon.textContent = "⏱️";
    title.textContent = "Active: Traffic Delay Express Route";
    desc.textContent = "Day schedule adjusted with time buffers to comfortably handle flight or highway delays.";
  } else if (state.activeDisruption === "chill") {
    icon.textContent = "🧘";
    title.textContent = "Active: Relaxation & Wellness Mode";
    desc.textContent = "Pace relaxed with calm cafes, tea lounges, and spa treatments.";
  } else {
    icon.textContent = "⚡";
    title.textContent = "Dynamic Trip Disruption Assistant";
    desc.textContent = "Something unexpected happened during your trip? Auto-adapt your route and budget in 1 click.";
  }
}

// =============================================================================
// 7. TRANSIT & CAB BOOKING HUB
// =============================================================================

function renderTransitView() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const transit = destInfo.transitInfo;
  if (!transit) return;

  const airportElem = document.getElementById("transit-airport-info");
  const localList = document.getElementById("local-transport-options-list");
  const avgBadge = document.getElementById("local-transit-avg-badge");

  if (airportElem) {
    airportElem.innerHTML = `
      <strong>✈️ Airport:</strong> ${transit.airport}<br>
      <strong>🚆 Railway:</strong> ${transit.railway}
    `;
  }

  if (avgBadge) {
    avgBadge.textContent = `Avg ₹${destInfo.avgDailyTransport}/day`;
  }

  if (localList) {
    localList.innerHTML = transit.localTransport.map(lt => `
      <div class="local-transit-item">
        <div class="lt-left">
          <span class="lt-name">${lt.type}</span>
          <span class="lt-sub">${lt.bookingPartner} · ${lt.tip}</span>
        </div>
        <div class="lt-cost">₹${lt.avgCost}</div>
      </div>
    `).join("");
  }
}

function addTransitActivity(name, cost, timeSlot = "Morning (08:30 AM)") {
  const targetDay = state.itinerary[0];
  if (!targetDay) return;

  const transitItem = {
    id: `transit-${Date.now()}`,
    name: name,
    timeSlot: timeSlot,
    category: "transit",
    cost: Number(cost) || 750,
    duration: "1 hour",
    description: "Dedicated pre-booked transit transfer with door-to-door cab pickup.",
    tip: "Keep driver contact and OTP handy for quick boarding.",
    coords: DESTINATIONS_DATA[state.destination]?.centerCoords
  };

  targetDay.activities.unshift(transitItem);
  saveToLocalStorage();
  renderDayTabs();
  renderDayContent();
  recalculateBudget();
  if (state.activeViewMode === "map") initOrUpdateMap();
  showToast("Transit Added to Day 1!", `Added "${name}" (₹${cost}) to your itinerary and budget.`, "success");
}

// =============================================================================
// 8. LIVE BUDGET TRACKER & RECALCULATION
// =============================================================================

function recalculateBudget() {
  let totalCost = 0;
  state.itinerary.forEach(day => {
    day.activities.forEach(act => {
      totalCost += (Number(act.cost) || 0);
    });
  });

  const setBudget = Number(state.totalBudget) || 18000;
  const remaining = setBudget - totalCost;
  const spentPct = setBudget > 0 ? Math.min(Math.round((totalCost / setBudget) * 100), 100) : 100;
  const numDays = state.itinerary.length || 1;
  const dailyAvg = Math.round(totalCost / numDays);

  const statusBadge = document.getElementById("budget-status-badge");
  const barFill = document.getElementById("budget-bar-fill");
  const spentPctText = document.getElementById("budget-spent-pct");
  const remainingText = document.getElementById("budget-remaining-text");
  const valSetBudget = document.getElementById("val-set-budget");
  const valTotalCost = document.getElementById("val-total-cost");
  const valDailyAvg = document.getElementById("val-daily-avg");
  const valBalance = document.getElementById("val-balance");
  const lblBalance = document.getElementById("lbl-balance-status");

  if (valSetBudget) valSetBudget.textContent = `₹${setBudget.toLocaleString('en-IN')}`;
  if (valTotalCost) valTotalCost.textContent = `₹${totalCost.toLocaleString('en-IN')}`;
  if (valDailyAvg) valDailyAvg.textContent = `₹${dailyAvg.toLocaleString('en-IN')} / day`;

  if (barFill) {
    barFill.style.width = `${Math.min((totalCost / setBudget) * 100, 100)}%`;
  }

  if (remaining >= 0) {
    if (statusBadge) {
      statusBadge.textContent = "✓ Within Budget";
      statusBadge.className = "budget-status-pill within";
    }
    if (barFill) barFill.className = "budget-bar-fill within";
    if (spentPctText) spentPctText.textContent = `${spentPct}% allocated`;
    if (remainingText) remainingText.textContent = `₹${remaining.toLocaleString('en-IN')} remaining`;
    if (lblBalance) lblBalance.textContent = "Remaining Balance";
    if (valBalance) {
      valBalance.textContent = `+ ₹${remaining.toLocaleString('en-IN')}`;
      valBalance.className = "b-num-val green";
    }
  } else {
    const overAmt = Math.abs(remaining);
    if (statusBadge) {
      statusBadge.textContent = `⚠️ Over Budget by ₹${overAmt.toLocaleString('en-IN')}`;
      statusBadge.className = "budget-status-pill over";
    }
    if (barFill) barFill.className = "budget-bar-fill over";
    if (spentPctText) spentPctText.textContent = `${Math.round((totalCost / setBudget) * 100)}% allocated`;
    if (remainingText) remainingText.textContent = `₹${overAmt.toLocaleString('en-IN')} deficit`;
    if (lblBalance) lblBalance.textContent = "Over Budget By";
    if (valBalance) {
      valBalance.textContent = `- ₹${overAmt.toLocaleString('en-IN')}`;
      valBalance.className = "b-num-val red";
    }
  }
}

function renderInsights() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const container = document.getElementById("destination-insights-list");
  if (!container) return;

  container.innerHTML = `
    <div class="insight-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <div><strong>Best Season:</strong> ${destInfo.bestTime} for outdoor travel.</div>
    </div>
    <div class="insight-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      <div><strong>Local Commute:</strong> Avg ₹${destInfo.avgDailyTransport}/day for Autos, Scooters & Taxis.</div>
    </div>
    <div class="insight-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <div><strong>Dynamic Defense:</strong> Use the ⚡ Disruption Assistant if rain or traffic delays your day.</div>
    </div>
  `;
}

function getCategoryLabel(cat) {
  switch (cat) {
    case "culture": return "🏛️ Culture";
    case "nature": return "🌿 Nature";
    case "adventure": return "⚡ Adventure";
    case "food": return "🍛 Food";
    case "nightlife": return "🍸 Nightlife";
    case "wellness": return "🧘 Wellness";
    case "shopping": return "🛍️ Shopping";
    case "transit": return "🚗 Transport";
    default: return "📍 Attraction";
  }
}

// =============================================================================
// 9. ACTIVITY ACTIONS: MOVE, DELETE, ADD, EDIT
// =============================================================================

function moveActivity(dayIndex, actIndex, direction) {
  const activities = state.itinerary[dayIndex].activities;
  const targetIndex = actIndex + direction;
  if (targetIndex < 0 || targetIndex >= activities.length) return;

  const temp = activities[actIndex];
  activities[actIndex] = activities[targetIndex];
  activities[targetIndex] = temp;

  saveToLocalStorage();
  renderDayContent();
  if (state.activeViewMode === "map") initOrUpdateMap();
  showToast("Reordered", `Moved activity ${direction < 0 ? 'up' : 'down'}.`, "info");
}

function deleteActivity(dayIndex, actIndex) {
  const actName = state.itinerary[dayIndex].activities[actIndex]?.name || "Activity";
  state.itinerary[dayIndex].activities.splice(actIndex, 1);
  saveToLocalStorage();
  renderDayTabs();
  renderDayContent();
  recalculateBudget();
  if (state.activeViewMode === "map") initOrUpdateMap();
  showToast("Activity Removed", `Deleted ${actName} from Day ${state.itinerary[dayIndex].dayNum}.`, "info");
}

function addNewDay() {
  const newDayNum = state.itinerary.length + 1;
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  
  const existingNames = new Set();
  state.itinerary.forEach(d => d.activities.forEach(a => existingNames.add(a.name)));
  const available = destInfo.places.filter(p => !existingNames.has(p.name));
  const newActivities = [];

  if (available.length > 0) {
    newActivities.push(JSON.parse(JSON.stringify(available[0])));
    if (available.length > 1) newActivities.push(JSON.parse(JSON.stringify(available[1])));
  } else {
    newActivities.push({
      id: `custom-chill-${newDayNum}`,
      name: `Local Market & Sunset Walk in ${destInfo.name}`,
      timeSlot: "Evening (05:00 PM)",
      category: "nature",
      cost: 200,
      duration: "2 hours",
      description: "Relax, explore regional handicraft stores, and try street food snacks.",
      tip: "Great day for casual photography and buying souvenirs.",
      coords: destInfo.centerCoords
    });
  }

  state.itinerary.push({
    dayNum: newDayNum,
    title: `Day ${newDayNum}: Extended Highlights of ${destInfo.name}`,
    activities: newActivities
  });

  state.daysCount = state.itinerary.length;
  state.activeDayTab = state.itinerary.length - 1;
  saveToLocalStorage();
  renderDayTabs();
  renderDayContent();
  recalculateBudget();
  if (state.activeViewMode === "map") initOrUpdateMap();
  showToast(`Day ${newDayNum} Added!`, `Trip extended to ${state.daysCount} days.`, "success");
}

function deleteDay(dayIndex) {
  if (state.itinerary.length <= 1) {
    alert("Your trip must have at least 1 day.");
    return;
  }
  state.itinerary.splice(dayIndex, 1);
  state.itinerary.forEach((d, i) => {
    d.dayNum = i + 1;
    d.title = d.title.replace(/^Day \d+/, `Day ${i + 1}`);
  });
  state.daysCount = state.itinerary.length;
  if (state.activeDayTab >= state.itinerary.length) {
    state.activeDayTab = state.itinerary.length - 1;
  }
  saveToLocalStorage();
  renderDayTabs();
  renderDayContent();
  recalculateBudget();
  if (state.activeViewMode === "map") initOrUpdateMap();
  showToast("Day Deleted", `Trip adjusted to ${state.daysCount} days.`, "info");
}

function setupCardDragAndDrop(card, dayIndex, actIndex) {
  card.addEventListener("dragstart", (e) => {
    draggedCard = { dayIndex, actIndex };
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    draggedCard = null;
  });

  card.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  card.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!draggedCard) return;

    const fromDay = draggedCard.dayIndex;
    const fromAct = draggedCard.actIndex;
    const toDay = dayIndex;
    const toAct = actIndex;

    if (fromDay === toDay && fromAct === toAct) return;

    const movedItem = state.itinerary[fromDay].activities.splice(fromAct, 1)[0];
    state.itinerary[toDay].activities.splice(toAct, 0, movedItem);

    saveToLocalStorage();
    renderDayContent();
    renderDayTabs();
    recalculateBudget();
    if (state.activeViewMode === "map") initOrUpdateMap();
    showToast("Reordered via Drag & Drop", "Moved to new position.", "info");
  });
}

// =============================================================================
// 10. MODALS & EVENT LISTENERS
// =============================================================================

function openAddActivityModal(dayIndex) {
  const modal = document.getElementById("modal-activity");
  const title = document.getElementById("modal-activity-title");
  if (!modal) return;

  document.getElementById("modal-day-index").value = dayIndex;
  document.getElementById("modal-act-index").value = "-1";
  title.textContent = `Add Place / Activity to Day ${state.itinerary[dayIndex].dayNum}`;

  document.getElementById("modal-act-name").value = "";
  document.getElementById("modal-act-time").value = "Morning (10:00 AM)";
  document.getElementById("modal-act-category").value = "culture";
  document.getElementById("modal-act-cost").value = 250;
  document.getElementById("modal-act-duration").value = "2 hours";
  document.getElementById("modal-act-desc").value = "";
  document.getElementById("modal-act-tip").value = "";

  modal.classList.remove("hidden");
}

function openEditActivityModal(dayIndex, actIndex) {
  const modal = document.getElementById("modal-activity");
  const title = document.getElementById("modal-activity-title");
  const act = state.itinerary[dayIndex].activities[actIndex];
  if (!modal || !act) return;

  document.getElementById("modal-day-index").value = dayIndex;
  document.getElementById("modal-act-index").value = actIndex;
  title.textContent = `Edit Details: ${act.name}`;

  document.getElementById("modal-act-name").value = act.name || "";
  document.getElementById("modal-act-time").value = act.timeSlot || "Morning (10:00 AM)";
  document.getElementById("modal-act-category").value = act.category || "culture";
  document.getElementById("modal-act-cost").value = act.cost || 0;
  document.getElementById("modal-act-duration").value = act.duration || "2 hours";
  document.getElementById("modal-act-desc").value = act.description || "";
  document.getElementById("modal-act-tip").value = act.tip || "";

  modal.classList.remove("hidden");
}

function closeActivityModal() {
  document.getElementById("modal-activity")?.classList.add("hidden");
}

function setupEventListeners() {
  // Form Submit
  document.getElementById("trip-planner-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    state.destination = document.getElementById("select-destination").value;
    state.daysCount = Number(document.getElementById("input-days").value) || 3;
    state.totalBudget = Number(document.getElementById("input-budget").value) || 18000;
    generateItinerary();
  });

  // View Mode Switcher buttons
  document.querySelectorAll(".view-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      switchViewMode(mode);
    });
  });

  // Disruption Scenario Buttons
  document.getElementById("btn-scenario-rain")?.addEventListener("click", () => applyDisruptionScenario("rain"));
  document.getElementById("btn-scenario-delay")?.addEventListener("click", () => applyDisruptionScenario("delay"));
  document.getElementById("btn-scenario-chill")?.addEventListener("click", () => applyDisruptionScenario("chill"));
  document.getElementById("btn-reset-reroute")?.addEventListener("click", () => applyDisruptionScenario("reset"));

  // Quick Transit Add Buttons
  document.getElementById("btn-add-airport-pickup")?.addEventListener("click", () => {
    addTransitActivity("Airport to Hotel Private AC Cab Pickup", 750, "Morning (08:30 AM)");
  });

  document.getElementById("btn-add-station-transfer")?.addEventListener("click", () => {
    addTransitActivity("Railway Station to Hotel Auto/Cab Transfer", 400, "Morning (09:00 AM)");
  });

  document.getElementById("btn-add-daily-cab")?.addEventListener("click", () => {
    addTransitActivity("Full-Day Private Sightseeing AC Taxi (8 hrs)", 1800, "Morning (09:00 AM)");
  });

  // Quick Sample Trip
  document.getElementById("btn-sample-trip")?.addEventListener("click", () => {
    state.destination = "jaipur";
    state.daysCount = 3;
    state.totalBudget = 18000;
    state.selectedInterests = ["culture", "food", "nature"];
    syncFormWithState();
    generateItinerary();
  });

  // Brand Home Reset
  document.getElementById("btn-brand-home")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.getElementById("btn-reset-form")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById("select-destination").focus();
  });

  // Modal Submit
  document.getElementById("form-activity-edit")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const dayIndex = Number(document.getElementById("modal-day-index").value);
    const actIndex = Number(document.getElementById("modal-act-index").value);

    const updatedActivity = {
      id: actIndex === -1 ? `custom-${Date.now()}` : state.itinerary[dayIndex].activities[actIndex].id,
      name: document.getElementById("modal-act-name").value.trim(),
      timeSlot: document.getElementById("modal-act-time").value.trim(),
      category: document.getElementById("modal-act-category").value,
      cost: Number(document.getElementById("modal-act-cost").value) || 0,
      duration: document.getElementById("modal-act-duration").value.trim(),
      description: document.getElementById("modal-act-desc").value.trim(),
      tip: document.getElementById("modal-act-tip").value.trim(),
      coords: actIndex === -1 
        ? DESTINATIONS_DATA[state.destination]?.centerCoords 
        : (state.itinerary[dayIndex].activities[actIndex].coords || DESTINATIONS_DATA[state.destination]?.centerCoords)
    };

    if (actIndex === -1) {
      state.itinerary[dayIndex].activities.push(updatedActivity);
      showToast("Activity Added", `Added "${updatedActivity.name}" to Day ${state.itinerary[dayIndex].dayNum}.`, "success");
    } else {
      state.itinerary[dayIndex].activities[actIndex] = updatedActivity;
      showToast("Activity Updated", `Updated details for "${updatedActivity.name}".`, "success");
    }

    closeActivityModal();
    saveToLocalStorage();
    renderDayTabs();
    renderDayContent();
    recalculateBudget();
    if (state.activeViewMode === "map") initOrUpdateMap();
  });

  document.getElementById("btn-close-modal")?.addEventListener("click", closeActivityModal);
  document.getElementById("btn-cancel-modal")?.addEventListener("click", closeActivityModal);

  document.getElementById("btn-print-itinerary")?.addEventListener("click", () => window.print());
  document.getElementById("btn-copy-itinerary")?.addEventListener("click", copyItineraryToClipboard);
}

function copyItineraryToClipboard() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  let text = `✈️ TravelPilot Itinerary: ${destInfo.name}, India (${state.daysCount} Days)\n`;
  text += `💰 Budget: ₹${state.totalBudget.toLocaleString('en-IN')}\n\n`;

  state.itinerary.forEach(day => {
    const dayCost = day.activities.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
    text += `═══════════════════════════════════\n`;
    text += `📅 DAY ${day.dayNum}: ${day.title.replace(/^Day \d+:\s*/, '')} (Subtotal: ₹${dayCost.toLocaleString('en-IN')})\n`;
    text += `═══════════════════════════════════\n`;
    
    day.activities.forEach((act, i) => {
      text += `${i + 1}. [${act.timeSlot}] ${act.name} — ₹${act.cost}\n`;
      if (act.description) text += `   • ${act.description}\n`;
      if (act.tip) text += `   💡 Tip: ${act.tip}\n`;
    });
    text += `\n`;
  });

  text += `Generated with TravelPilot India Trip Planner.\n`;

  navigator.clipboard.writeText(text).then(() => {
    showToast("Copied to Clipboard!", "Full plan ready to share on WhatsApp or Notes.", "success");
  }).catch(() => {
    showToast("Copy Note", "Please select and copy text manually.", "info");
  });
}

function saveToLocalStorage() {
  try {
    localStorage.setItem("travelpilot_saved_trip", JSON.stringify(state));
  } catch (e) {
    // Handled
  }
}

function showToast(title, message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : 'ℹ️'}</span>
    <div>
      <div style="font-weight: 700;">${title}</div>
      <div style="font-size: 0.78rem; opacity: 0.9;">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}
