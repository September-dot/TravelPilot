/**
 * TravelPilot - Interactive Trip Planner Engine
 * Client-side reactive state, live budget recalculation, drag-and-drop & in-memory editing.
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
  itinerary: [], // Array of days: [ { dayNum: 1, title: "...", activities: [...] }, ... ]
  insights: []
};

// =============================================================================
// 2. INITIALIZATION & SETUP
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  renderInterestChips();
  setupEventListeners();

  // Check if there is saved state in localStorage
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

  // Pre-generate default trip
  generateItinerary();
});

// Render the 7 interest category checkboxes
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
        if (!state.selectedInterests.includes(cat.id)) {
          state.selectedInterests.push(cat.id);
        }
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

  // Sync checkboxes
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
// 3. ITINERARY GENERATION ALGORITHM
// =============================================================================

function generateItinerary() {
  const destKey = state.destination;
  const destInfo = DESTINATIONS_DATA[destKey] || DESTINATIONS_DATA.jaipur;
  const allPlaces = [...destInfo.places];

  // Prioritize places matching user interests
  const scoredPlaces = allPlaces.map(p => {
    let score = 0;
    if (state.selectedInterests.includes(p.category)) score += 5;
    return { ...p, score };
  });

  // Sort by score descending
  scoredPlaces.sort((a, b) => b.score - a.score);

  const numDays = state.daysCount;
  const days = [];
  const usedPlaceIds = new Set();

  for (let d = 1; d <= numDays; d++) {
    // Pick 2 to 3 places for this day
    const dayActivities = [];
    
    // Pick morning/afternoon/evening slots
    for (const place of scoredPlaces) {
      if (dayActivities.length >= 3) break;
      if (!usedPlaceIds.has(place.id)) {
        dayActivities.push(JSON.parse(JSON.stringify(place)));
        usedPlaceIds.add(place.id);
      }
    }

    // If we ran out of unique places, reuse or create a custom leisure slot
    if (dayActivities.length === 0) {
      dayActivities.push({
        id: `custom-chill-${d}`,
        name: `Leisure & Local Cafe Exploration in ${destInfo.name}`,
        timeSlot: "Afternoon (02:00 PM)",
        category: "food",
        cost: 400,
        duration: "2 hours",
        description: `Stroll through the local streets, visit nearby markets, and enjoy regional delicacies.`,
        tip: "Ask your hotel host for their favorite hidden dining spot."
      });
    }

    // Day theme titles
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
  state.activeDayTab = 0;
  saveToLocalStorage();
  renderDashboard();
  showToast("Custom Itinerary Generated!", `Crafted a personalized ${numDays}-day plan for ${destInfo.name}.`, "success");
}

// =============================================================================
// 4. RENDERING & UI SYNC
// =============================================================================

function renderDashboard() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;

  // Show dashboard, scroll smoothly
  const dashboardSec = document.getElementById("section-dashboard");
  if (dashboardSec) dashboardSec.style.display = "block";

  // Destination Banner
  document.getElementById("dest-title").textContent = `${destInfo.name} — ${state.daysCount} Day Itinerary`;
  document.getElementById("dest-tagline").textContent = destInfo.tagline;
  document.getElementById("dest-state-badge").textContent = destInfo.state;
  document.getElementById("dest-time-badge").textContent = `Best Time: ${destInfo.bestTime}`;

  const highlightsContainer = document.getElementById("dest-highlights-list");
  if (highlightsContainer) {
    highlightsContainer.innerHTML = destInfo.highlights.map(h => `<span class="meta-chip">✨ ${h}</span>`).join("");
  }

  renderDayTabs();
  renderDayContent();
  recalculateBudget();
  renderInsights();
}

// Render Day Tabs Navigation
function renderDayTabs() {
  const tabsContainer = document.getElementById("days-nav-tabs");
  if (!tabsContainer) return;
  tabsContainer.innerHTML = "";

  // "All Days" Tab
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
  });
  tabsContainer.appendChild(allTab);

  // Individual Day Tabs
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
    });

    tabsContainer.appendChild(tabBtn);
  });

  // "+ Add Day" button
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

  // Single Day View vs All Days View
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
    daySection.className = "day-wrapper";
    daySection.style.marginBottom = "24px";

    // Day Header
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

    // Activities List
    const actList = document.createElement("div");
    actList.className = "activities-list";
    actList.style.marginTop = "12px";

    day.activities.forEach((act, actIndex) => {
      const actCard = document.createElement("div");
      actCard.className = "activity-card";
      actCard.draggable = true;
      actCard.dataset.dayIndex = dayIndex;
      actCard.dataset.actIndex = actIndex;

      // Category styling
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

      // Drag & Drop Setup
      setupCardDragAndDrop(actCard, dayIndex, actIndex);

      // Inline Cost Change Listener
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

    // "+ Add Activity to Day" button
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
    // update tab if it exists
    if (tabs[idx + 1]) {
      const costSpan = tabs[idx + 1].querySelector(".tab-day-cost");
      if (costSpan) costSpan.textContent = `₹${dayCost.toLocaleString('en-IN')}`;
    }
  });

  // update all header badges on page
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
// 5. LIVE BUDGET TRACKER & RECALCULATION
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
    // Within Budget
    if (statusBadge) {
      statusBadge.textContent = "✓ Within Budget";
      statusBadge.className = "budget-status-pill within";
    }
    if (barFill) {
      barFill.className = "budget-bar-fill within";
    }
    if (spentPctText) spentPctText.textContent = `${spentPct}% allocated`;
    if (remainingText) remainingText.textContent = `₹${remaining.toLocaleString('en-IN')} remaining`;
    if (lblBalance) lblBalance.textContent = "Remaining Balance";
    if (valBalance) {
      valBalance.textContent = `+ ₹${remaining.toLocaleString('en-IN')}`;
      valBalance.className = "b-num-val green";
    }
  } else {
    // Over Budget
    const overAmt = Math.abs(remaining);
    if (statusBadge) {
      statusBadge.textContent = `⚠️ Over Budget by ₹${overAmt.toLocaleString('en-IN')}`;
      statusBadge.className = "budget-status-pill over";
    }
    if (barFill) {
      barFill.className = "budget-bar-fill over";
    }
    if (spentPctText) spentPctText.textContent = `${Math.round((totalCost / setBudget) * 100)}% allocated`;
    if (remainingText) remainingText.textContent = `₹${overAmt.toLocaleString('en-IN')} deficit`;
    if (lblBalance) lblBalance.textContent = "Over Budget By";
    if (valBalance) {
      valBalance.textContent = `- ₹${overAmt.toLocaleString('en-IN')}`;
      valBalance.className = "b-num-val red";
    }
  }
}

// Render Destination Insights
function renderInsights() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const container = document.getElementById("destination-insights-list");
  if (!container) return;

  container.innerHTML = `
    <div class="insight-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <div><strong>Best Season:</strong> ${destInfo.bestTime} for pleasant outdoor weather.</div>
    </div>
    <div class="insight-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      <div><strong>Local Commute:</strong> Avg ₹${destInfo.avgDailyTransport}/day for Autos, Scooters & Cabs.</div>
    </div>
    <div class="insight-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <div><strong>Safety & Smart Travel:</strong> Keep digital copies of ID and book top monuments online for fast entry.</div>
    </div>
  `;
}

// Helper: category label format
function getCategoryLabel(cat) {
  switch (cat) {
    case "culture": return "🏛️ Culture";
    case "nature": return "🌿 Nature";
    case "adventure": return "⚡ Adventure";
    case "food": return "🍛 Food";
    case "nightlife": return "🍸 Nightlife";
    case "wellness": return "🧘 Wellness";
    case "shopping": return "🛍️ Shopping";
    default: return "📍 Attraction";
  }
}

// =============================================================================
// 6. ACTIVITY & DAY MANAGEMENT (EDIT, MOVE, DELETE, ADD)
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
  showToast("Reordered", `Moved activity ${direction < 0 ? 'up' : 'down'}.`, "info");
}

function deleteActivity(dayIndex, actIndex) {
  const actName = state.itinerary[dayIndex].activities[actIndex]?.name || "Activity";
  state.itinerary[dayIndex].activities.splice(actIndex, 1);
  saveToLocalStorage();
  renderDayTabs();
  renderDayContent();
  recalculateBudget();
  showToast("Activity Removed", `Deleted ${actName} from Day ${state.itinerary[dayIndex].dayNum}.`, "info");
}

function addNewDay() {
  const newDayNum = state.itinerary.length + 1;
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  
  // Pick unused places from destination dataset if available
  const existingPlaceNames = new Set();
  state.itinerary.forEach(d => d.activities.forEach(a => existingPlaceNames.add(a.name)));

  const availablePlaces = destInfo.places.filter(p => !existingPlaceNames.has(p.name));
  const newActivities = [];

  if (availablePlaces.length > 0) {
    newActivities.push(JSON.parse(JSON.stringify(availablePlaces[0])));
    if (availablePlaces.length > 1) {
      newActivities.push(JSON.parse(JSON.stringify(availablePlaces[1])));
    }
  } else {
    newActivities.push({
      id: `custom-chill-${newDayNum}`,
      name: `Local Market & Sunset Stroll in ${destInfo.name}`,
      timeSlot: "Evening (05:00 PM)",
      category: "nature",
      cost: 200,
      duration: "2 hours",
      description: "Relax, explore regional handicraft stores, and try street food snacks.",
      tip: "Great day for casual photography and buying souvenirs."
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
  showToast(`Day ${newDayNum} Added!`, `Trip extended to ${state.daysCount} days.`, "success");
}

function deleteDay(dayIndex) {
  if (state.itinerary.length <= 1) {
    alert("Your trip must have at least 1 day.");
    return;
  }
  state.itinerary.splice(dayIndex, 1);
  // Renumber remaining days
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
  showToast("Day Deleted", `Trip adjusted to ${state.daysCount} days.`, "info");
}

// Drag & Drop Setup
let draggedCard = null;

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
    showToast("Reordered via Drag & Drop", `Moved to new position.`, "info");
  });
}

// =============================================================================
// 7. MODAL EDIT & ADD ACTIVITY HANDLERS
// =============================================================================

function openAddActivityModal(dayIndex) {
  const modal = document.getElementById("modal-activity");
  const title = document.getElementById("modal-activity-title");
  const form = document.getElementById("form-activity-edit");

  if (!modal || !form) return;

  document.getElementById("modal-day-index").value = dayIndex;
  document.getElementById("modal-act-index").value = "-1"; // -1 for new
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
  const modal = document.getElementById("modal-activity");
  if (modal) modal.classList.add("hidden");
}

// =============================================================================
// 8. EVENT LISTENERS & EXPORT TOOLS
// =============================================================================

function setupEventListeners() {
  // Trip Setup Form Submit
  const form = document.getElementById("trip-planner-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      state.destination = document.getElementById("select-destination").value;
      state.daysCount = Number(document.getElementById("input-days").value) || 3;
      state.totalBudget = Number(document.getElementById("input-budget").value) || 18000;
      generateItinerary();
    });
  }

  // Brand home click & New Trip button
  document.getElementById("btn-brand-home")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.getElementById("btn-reset-form")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById("select-destination").focus();
  });

  // Quick Sample Trip (Jaipur 3 Days)
  document.getElementById("btn-sample-trip")?.addEventListener("click", () => {
    state.destination = "jaipur";
    state.daysCount = 3;
    state.totalBudget = 18000;
    state.selectedInterests = ["culture", "food", "nature"];
    syncFormWithState();
    generateItinerary();
  });

  // Modal Submit
  const modalForm = document.getElementById("form-activity-edit");
  modalForm?.addEventListener("submit", (e) => {
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
      tip: document.getElementById("modal-act-tip").value.trim()
    };

    if (actIndex === -1) {
      // Add new
      state.itinerary[dayIndex].activities.push(updatedActivity);
      showToast("Activity Added", `Added "${updatedActivity.name}" to Day ${state.itinerary[dayIndex].dayNum}.`, "success");
    } else {
      // Edit existing
      state.itinerary[dayIndex].activities[actIndex] = updatedActivity;
      showToast("Activity Updated", `Updated details for "${updatedActivity.name}".`, "success");
    }

    closeActivityModal();
    saveToLocalStorage();
    renderDayTabs();
    renderDayContent();
    recalculateBudget();
  });

  // Close Modal Buttons
  document.getElementById("btn-close-modal")?.addEventListener("click", closeActivityModal);
  document.getElementById("btn-cancel-modal")?.addEventListener("click", closeActivityModal);

  // Print / PDF Button
  document.getElementById("btn-print-itinerary")?.addEventListener("click", () => {
    window.print();
  });

  // Copy Plan Text to Clipboard
  document.getElementById("btn-copy-itinerary")?.addEventListener("click", () => {
    copyItineraryToClipboard();
  });
}

// Copy Plain-Text Itinerary for WhatsApp / Notes
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
    showToast("Copied to Clipboard!", "Full day-by-day plan ready to share on WhatsApp or Notes.", "success");
  }).catch(() => {
    showToast("Copy Note", "Please select and copy the text manually.", "info");
  });
}

// LocalStorage Persistence
function saveToLocalStorage() {
  try {
    localStorage.setItem("travelpilot_saved_trip", JSON.stringify(state));
  } catch (e) {
    // Graceful fallback
  }
}

// Toast Feedback System
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
