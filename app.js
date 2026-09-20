/**
 * TravelPilot - Algorithmic Trip Planner & AI Route Optimizer for India
 *
 * Technical Highlights:
 *  - Hybrid TSP Optimizer: Exact Permutations for n <= 7, 2-Opt Local Search for n > 7 (Zero freeze risk)
 *  - AI Co-Pilot: Natural Language Intent Parser with Transparent Decision Reasoning
 *  - Geodesic Distance (Haversine km) & Real-World Transit Estimates
 *  - Proactive Rule-Based Delay, Timing & Weather Risk Analyzer
 *  - Multi-Day Disruption Contingency Engine (Monsoon, Traffic Delay, Low-Energy)
 *  - Multi-Tier Budget-Constrained Itinerary Generator (Budget, Moderate, Luxury)
 *  - Interactive Leaflet.js Route Map with Visible Place Labels & Distance Badges
 *  - Secure HTML Entity Sanitization (XSS Defense)
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
let draggedCard = null;

// Day Pin Palette
const DAY_COLORS = ["#ea580c", "#4f46e5", "#059669", "#e11d48", "#d97706", "#7c3aed", "#0284c7"];

// =============================================================================
// 2. SECURITY & UTILITY HELPERS
// =============================================================================

// Safe HTML escaping for all user-provided / editable text
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Geodesic Distance via Haversine Formula (in Kilometers)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Estimate Drive/Cab Time in Minutes (urban/hill speed estimate ~25 km/h + 5m buffer)
function estimateDriveTimeMin(distKm) {
  if (distKm <= 0.3) return 5;
  const driveMinutes = Math.round((distKm / 25) * 60) + 5;
  return Math.max(driveMinutes, 8);
}

// Calculate cumulative route distance for an array of activities
function calculatePathDistance(activities, defaultCenter) {
  if (!activities || activities.length <= 1) return 0;
  let total = 0;
  for (let i = 0; i < activities.length - 1; i++) {
    const c1 = activities[i].coords || defaultCenter;
    const c2 = activities[i + 1].coords || defaultCenter;
    total += calculateDistanceKm(c1[0], c1[1], c2[0], c2[1]);
  }
  return Number(total.toFixed(1));
}

// Generate all permutations of an array (used only when n <= 7)
function getPermutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
    const remainingPerms = getPermutations(remaining);
    for (let j = 0; j < remainingPerms.length; j++) {
      result.push([current].concat(remainingPerms[j]));
    }
  }
  return result;
}

// Nearest-Neighbour Heuristic with 2-Opt Local Search for larger lists (n > 7)
// Eliminates O(n!) permutation freeze risk (e.g. 10 stops = 3.6 million permutations)
function nearestNeighborWithTwoOpt(activities, defaultCenter) {
  if (activities.length <= 2) return activities;
  const center = defaultCenter || [26.9124, 75.7873];
  
  // Step 1: Construct initial tour using Nearest-Neighbour Greedy Heuristic
  const unvisited = [...activities];
  const tour = [unvisited.shift()];
  
  while (unvisited.length > 0) {
    const current = tour[tour.length - 1];
    const curCoords = current.coords || center;
    let nearestIdx = 0;
    let minD = Infinity;
    
    for (let i = 0; i < unvisited.length; i++) {
      const nextCoords = unvisited[i].coords || center;
      const d = calculateDistanceKm(curCoords[0], curCoords[1], nextCoords[0], nextCoords[1]);
      if (d < minD) {
        minD = d;
        nearestIdx = i;
      }
    }
    tour.push(unvisited.splice(nearestIdx, 1)[0]);
  }
  
  // Step 2: Refine tour using 2-Opt Local Search
  let bestRoute = tour;
  let bestDist = calculatePathDistance(bestRoute, center);
  let improved = true;
  let iterations = 0;

  while (improved && iterations < 50) {
    improved = false;
    iterations++;
    for (let i = 1; i < bestRoute.length - 1; i++) {
      for (let k = i + 1; k < bestRoute.length; k++) {
        const newRoute = bestRoute.slice(0, i)
          .concat(bestRoute.slice(i, k + 1).reverse())
          .concat(bestRoute.slice(k + 1));
        const newDist = calculatePathDistance(newRoute, center);
        if (newDist < bestDist - 0.05) {
          bestRoute = newRoute;
          bestDist = newDist;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return bestRoute;
}

// =============================================================================
// 3. INITIALIZATION & SETUP
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
      <input type="checkbox" name="interest" value="${escapeHtml(cat.id)}" ${isChecked ? 'checked' : ''}>
      <span>${escapeHtml(cat.icon)}</span>
      <span>${escapeHtml(cat.label)}</span>
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
// 4. BUDGET-AWARE ITINERARY GENERATION ENGINE
// =============================================================================

function generateItinerary() {
  const destKey = state.destination;
  const destInfo = DESTINATIONS_DATA[destKey] || DESTINATIONS_DATA.jaipur;
  const allPlaces = [...destInfo.places];

  const numDays = state.daysCount || 3;
  const targetDailyBudget = (Number(state.totalBudget) || 18000) / numDays;

  // Score places based on interest relevance and budget tier compatibility
  const scoredPlaces = allPlaces.map(p => {
    let score = 0;

    // Interest category match (+6)
    if (state.selectedInterests.includes(p.category)) {
      score += 6;
    }

    // Budget shaping: favor activities matching user's financial tier
    const cost = Number(p.cost) || 0;
    if (targetDailyBudget < 2500) {
      // Budget tier (< ₹2,500/day): boost free & inexpensive sights, heavily penalize expensive ones
      if (cost <= 250 || p.costTier === "budget") score += 5;
      else if (cost > 1000 || p.costTier === "premium") score -= 8;
    } else if (targetDailyBudget > 6000) {
      // Luxury tier (> ₹6,000/day): boost signature and premium experiences
      if (cost >= 800 || p.costTier === "premium") score += 6;
      else if (cost === 0 && p.category !== "nature") score -= 2;
    } else {
      // Moderate tier (₹2,500 - ₹6,000/day): balanced distribution
      if (cost <= 750) score += 3;
    }

    return { ...p, score };
  });

  scoredPlaces.sort((a, b) => b.score - a.score);

  const days = [];
  const usedPlaceIds = new Set();

  for (let d = 1; d <= numDays; d++) {
    const dayActivities = [];
    let dayCost = 0;

    for (const place of scoredPlaces) {
      if (dayActivities.length >= 3) break;
      if (!usedPlaceIds.has(place.id)) {
        // Budget guard: prevent single day from wildly overshooting budget
        const placeCost = Number(place.cost) || 0;
        if (dayActivities.length >= 2 && (dayCost + placeCost) > (targetDailyBudget * 1.6) && targetDailyBudget < 3000) {
          continue; // Look for a more economical stop for the last slot
        }

        dayActivities.push(JSON.parse(JSON.stringify(place)));
        usedPlaceIds.add(place.id);
        dayCost += placeCost;
      }
    }

    if (dayActivities.length === 0) {
      dayActivities.push({
        id: `custom-chill-${d}`,
        name: `Leisure & Local Market Walk in ${destInfo.name}`,
        timeSlot: "Afternoon (02:00 PM)",
        category: "food",
        cost: 300,
        duration: "2 hours",
        description: `Stroll through the local streets, visit regional artisan stalls, and enjoy fresh delicacies.`,
        tip: "Ask your hotel host for their favorite hidden dining spot.",
        coords: destInfo.centerCoords,
        slotPreference: "afternoon",
        weatherSensitive: false,
        exertionLevel: "low",
        costTier: "budget"
      });
    }

    let dayTheme = `Day ${d}: Highlights of ${destInfo.name}`;
    if (d === 1) dayTheme = `Day 1: Iconic Landmarks & First Impressions`;
    else if (d === 2) dayTheme = `Day 2: Heritage, Culture & Local Flavors`;
    else if (d === 3) dayTheme = `Day 3: Scenic Vistas & Sunset Magic`;
    else if (d === 4) dayTheme = `Day 4: Adventure & Offbeat Trails`;
    else if (d === 5) dayTheme = `Day 5: Artisan Bazaars & Wellness`;
    else if (d >= 6) dayTheme = `Day ${d}: Extended Discovery & Leisure`;

    // Apply TSP ordering directly on newly generated day
    const optimizedActs = optimizeDayPath(dayActivities, destInfo.centerCoords);

    days.push({
      dayNum: d,
      title: dayTheme,
      activities: optimizedActs
    });
  }

  state.itinerary = days;
  state.originalItineraryBackup = JSON.parse(JSON.stringify(days));
  state.activeDayTab = 0;
  state.activeDisruption = null;

  saveToLocalStorage();
  renderDashboard();
  showToast("Custom Itinerary Generated!", `Crafted an optimized ${numDays}-day plan for ${destInfo.name}.`, "success");
}

// =============================================================================
// 5. HYBRID TSP ROUTE OPTIMIZER (Exact Permutations <=7, 2-Opt >7)
// =============================================================================

function optimizeDayPath(activities, defaultCenter) {
  if (!activities || activities.length <= 1) return activities;

  const center = defaultCenter || [26.9124, 75.7873];
  const n = activities.length;

  const timeSlotTemplates = [
    "Morning (09:00 AM)",
    "Morning (11:30 AM)",
    "Afternoon (02:00 PM)",
    "Evening (05:30 PM)",
    "Night (08:00 PM)"
  ];

  let bestPermutation = activities;

  if (n <= 7) {
    // Exact Permutation Solver for n <= 7 (Instantaneous <1ms)
    let minCost = Infinity;
    const allPerms = getPermutations(activities);

    for (let p = 0; p < allPerms.length; p++) {
      const perm = allPerms[p];
      const dist = calculatePathDistance(perm, center);

      // Slot affinity constraints
      let slotPenalty = 0;
      for (let i = 0; i < perm.length; i++) {
        const pref = perm[i].slotPreference || "any";
        if (pref === "morning" && i >= n - 1) {
          slotPenalty += 6.0;
        } else if ((pref === "evening" || pref === "night") && i === 0) {
          slotPenalty += 12.0;
        } else if (pref === "night" && i < n - 1) {
          slotPenalty += 8.0;
        }
      }

      const totalCost = dist + slotPenalty;
      if (totalCost < minCost) {
        minCost = totalCost;
        bestPermutation = perm;
      }
    }
  } else {
    // Fallback: Nearest-Neighbor + 2-Opt Local Search for n > 7 (Guaranteed zero UI freeze)
    bestPermutation = nearestNeighborWithTwoOpt(activities, center);
  }

  // Assign clean chronological time slots based on the optimized order
  const result = bestPermutation.map((act, idx) => {
    const updated = { ...act };
    updated.timeSlot = timeSlotTemplates[Math.min(idx, timeSlotTemplates.length - 1)];
    return updated;
  });

  return result;
}

// Auto-reroute all days or target day using TSP optimizer
function autoRerouteItinerary(targetDayIndex = -1) {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const center = destInfo.centerCoords || [26.9124, 75.7873];
  let totalKmSaved = 0;

  const daysToOptimize = targetDayIndex === -1 
    ? state.itinerary 
    : [state.itinerary[targetDayIndex]].filter(Boolean);

  daysToOptimize.forEach((day) => {
    if (day.activities.length <= 1) return;

    const initialKm = calculatePathDistance(day.activities, center);
    const optimized = optimizeDayPath(day.activities, center);
    const optimizedKm = calculatePathDistance(optimized, center);

    const saved = Math.max(0, initialKm - optimizedKm);
    totalKmSaved += saved;

    day.activities = optimized;
  });

  saveToLocalStorage();
  renderDashboard();
  if (state.activeViewMode === "map") initOrUpdateMap();

  const savedMins = Math.round((totalKmSaved / 25) * 60);
  showToast(
    "Route Optimized! ⚡",
    totalKmSaved > 0.3 
      ? `Reordered stops geographically! Saved ~${totalKmSaved.toFixed(1)} km & ~${savedMins} mins of transit delay.`
      : `Stops sequenced in optimal geographic order with harmonized time slots.`,
    "success"
  );
}

// =============================================================================
// 6. AI CO-PILOT: NATURAL LANGUAGE INTENT PARSER & ADAPTATION ENGINE
// =============================================================================

function parseAndExecuteAiPrompt(promptText) {
  if (!promptText || !promptText.trim()) return;

  const text = promptText.toLowerCase();
  const reasoningContainer = document.getElementById("ai-reasoning-container");
  const reasoningTitle = document.getElementById("ai-reasoning-title");
  const reasoningBody = document.getElementById("ai-reasoning-text");

  let detectedScenarios = [];
  let rationale = "";

  // Intent 1: Weather (Rain / Monsoon / Storm)
  const isRain = text.includes("rain") || text.includes("pouring") || text.includes("monsoon") || text.includes("storm") || text.includes("waterlog") || text.includes("wet");
  
  // Intent 2: Delay / Traffic / Late
  const isDelay = text.includes("delay") || text.includes("late") || text.includes("traffic") || text.includes("jam") || text.includes("flight delay") || text.includes("shorten");

  // Intent 3: Fatigue / Wellness / Chill
  const isChill = text.includes("tired") || text.includes("exhaust") || text.includes("chill") || text.includes("relax") || text.includes("spa") || text.includes("massage") || text.includes("rest") || text.includes("wellness");

  // Intent 4: Budget adjustment
  const isTightBudget = text.includes("tight budget") || text.includes("cheap") || text.includes("free") || text.includes("low budget") || text.includes("street food") || text.includes("money") || text.includes("economical");
  const isLuxury = text.includes("luxury") || text.includes("royal") || text.includes("high tea") || text.includes("cruise") || text.includes("expensive") || text.includes("premium");

  // Intent 5: Reset
  const isReset = text.includes("reset") || text.includes("original") || text.includes("start over") || text.includes("undo");

  if (isReset) {
    applyDisruptionScenario("reset");
    rationale = "Parsed request to restore baseline trip. Reverted all custom disruption overrides to your original generated plan.";
    if (reasoningTitle) reasoningTitle.textContent = "AI Action: Baseline Plan Restored";
    if (reasoningBody) reasoningBody.textContent = rationale;
    if (reasoningContainer) reasoningContainer.style.display = "flex";
    return;
  }

  // Execute Intent Combinations
  if (isRain && isChill) {
    applyDisruptionScenario("rain");
    applyDisruptionScenario("chill");
    rationale = "Detected rain conditions ('pouring/wet') and physical fatigue ('tired/exhausted'). Automatically converted outdoor viewpoints to sheltered indoor palaces & museums, while pacing the schedule with restorative wellness lounges across all days.";
    if (reasoningTitle) reasoningTitle.textContent = "AI Decision: Combined Monsoon + Wellness Reroute";
  } else if (isRain) {
    applyDisruptionScenario("rain");
    rationale = "Detected adverse weather advisory. Safely replaced all weather-sensitive forts, treks, and open-air activities with curated indoor royal museums and covered havelis across all days.";
    if (reasoningTitle) reasoningTitle.textContent = "AI Decision: Monsoon & Rain Shelter Mode";
  } else if (isDelay) {
    applyDisruptionScenario("delay");
    rationale = "Detected travel delay. Condensed daily stops to priority crown-jewel sights and injected time buffers (starting at 10:30 AM) to comfortably absorb flight/traffic delays.";
    if (reasoningTitle) reasoningTitle.textContent = "AI Decision: Express Delay Buffer Route";
  } else if (isChill) {
    applyDisruptionScenario("chill");
    rationale = "Detected need for relaxed pacing. Substituted high-exertion treks and uphill hikes with serene lakeside cafes, royal high-tea lounges, and Ayurvedic spa sessions.";
    if (reasoningTitle) reasoningTitle.textContent = "AI Decision: Relaxation & Wellness Pacing";
  } else if (isTightBudget) {
    state.totalBudget = Math.max(6000, Math.round(state.totalBudget * 0.6));
    syncFormWithState();
    generateItinerary();
    rationale = `Adapted plan for economical travel. Prioritized free public monuments, stepwells, ghat walks, and authentic street dining while filtering premium commercial tours.`;
    if (reasoningTitle) reasoningTitle.textContent = "AI Decision: Budget-Optimized Regeneration";
  } else if (isLuxury) {
    state.totalBudget = Math.max(30000, Math.round(state.totalBudget * 1.5));
    syncFormWithState();
    generateItinerary();
    rationale = "Upgraded itinerary with premium signature experiences including royal high-tea, private boat cruises, and luxury heritage dining.";
    if (reasoningTitle) reasoningTitle.textContent = "AI Decision: Luxury Tier Regeneration";
  } else {
    // General auto-reroute optimization
    autoRerouteItinerary(-1);
    rationale = "Evaluated current stop coordinates and time slot affinities. Reordered itinerary using TSP geometric optimization to minimize travel distance and transit delays.";
    if (reasoningTitle) reasoningTitle.textContent = "AI Decision: Route Geometry Optimized";
  }

  if (reasoningBody) reasoningBody.textContent = rationale;
  if (reasoningContainer) reasoningContainer.style.display = "flex";

  showToast("AI Co-Pilot Executed", "Applied scenario adaptations to your itinerary.", "success");
}

// =============================================================================
// 7. PROACTIVE DELAY, TIMING & WEATHER RISK ANALYZER
// =============================================================================

function analyzeItineraryHealth() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const center = destInfo.centerCoords || [26.9124, 75.7873];
  const issues = [];
  let totalTripKm = 0;
  let totalTripDriveMins = 0;

  state.itinerary.forEach((day) => {
    const acts = day.activities;

    for (let i = 0; i < acts.length; i++) {
      const cur = acts[i];
      const curCoords = cur.coords || center;

      // Check distance & delay to next stop
      if (i < acts.length - 1) {
        const next = acts[i + 1];
        const nextCoords = next.coords || center;
        const dist = calculateDistanceKm(curCoords[0], curCoords[1], nextCoords[0], nextCoords[1]);
        const driveM = estimateDriveTimeMin(dist);
        totalTripKm += dist;
        totalTripDriveMins += driveM;

        if (dist > 10) {
          issues.push({
            dayNum: day.dayNum,
            type: "distance_delay",
            severity: "high",
            tag: `⚠️ Day ${day.dayNum}: ${dist} km commute`,
            message: `Long distance (${dist} km · ~${driveM}m cab) between "${cur.name}" and "${next.name}" — risk of transit delay.`
          });
        }
      }

      // Check slot affinity mismatch
      const pref = cur.slotPreference || "any";
      const timeLower = (cur.timeSlot || "").toLowerCase();
      if ((pref === "evening" || pref === "night") && timeLower.includes("morning")) {
        issues.push({
          dayNum: day.dayNum,
          type: "timing_mismatch",
          severity: "medium",
          tag: `⚠️ Day ${day.dayNum}: Timing Conflict`,
          message: `"${cur.name}" is scheduled in the Morning, but best experienced in the Evening or Sunset.`
        });
      }

      // Proactive Weather Advisory: flag outdoor activities that are rain-vulnerable
      if (cur.weatherSensitive) {
        issues.push({
          dayNum: day.dayNum,
          type: "weather_advisory",
          severity: state.activeDisruption === "rain" ? "high" : "low",
          tag: `🌧️ Day ${day.dayNum}: Outdoor Sights`,
          message: `"${cur.name}" is an open-air venue vulnerable to rain delays or extreme heat.`
        });
      }
    }

    if (acts.length > 4) {
      issues.push({
        dayNum: day.dayNum,
        type: "overload",
        severity: "medium",
        tag: `⚠️ Day ${day.dayNum}: Overcrowded Day`,
        message: `${acts.length} stops in Day ${day.dayNum} may cause travel fatigue.`
      });
    }
  });

  // Filter out duplicate tag labels
  const uniqueIssues = [];
  const seenTags = new Set();
  issues.forEach(iss => {
    if (!seenTags.has(iss.tag)) {
      seenTags.add(iss.tag);
      uniqueIssues.push(iss);
    }
  });

  const highSeverityIssues = uniqueIssues.filter(i => i.severity !== "low");

  return {
    issues: uniqueIssues,
    hasSevereIssues: highSeverityIssues.length > 0,
    totalTripKm: Number(totalTripKm.toFixed(1)),
    totalTripDriveMins,
    isOptimal: highSeverityIssues.length === 0
  };
}

function updateAiDiagnosticsUI() {
  const card = document.getElementById("ai-diagnosis-card");
  const icon = document.getElementById("ai-diag-icon");
  const title = document.getElementById("ai-diag-title");
  const desc = document.getElementById("ai-diag-desc");
  const tagContainer = document.getElementById("ai-risk-tags-container");
  const btnReroute = document.getElementById("btn-ai-auto-reroute");

  if (!card || !tagContainer) return;

  const health = analyzeItineraryHealth();

  tagContainer.innerHTML = "";

  if (health.isOptimal) {
    card.className = "ai-diagnosis-card optimal";
    if (icon) icon.textContent = "✅";
    if (title) title.innerHTML = `<span>Route Optimization: Optimal Geometry</span>`;
    if (desc) desc.textContent = `All stops are sequenced for minimal travel distance (Total commute: ${health.totalTripKm} km · ~${health.totalTripDriveMins} mins cab across all days).`;
    if (btnReroute) {
      btnReroute.style.display = "none";
    }
  } else {
    card.className = "ai-diagnosis-card";
    if (icon) icon.textContent = "🧭";
    if (title) title.innerHTML = `<span>Route Diagnostics: ${health.issues.length} Travel Advisory Item${health.issues.length > 1 ? 's' : ''}</span>`;
    if (desc) desc.textContent = `Potential transit bottlenecks, geographic zigzags, or outdoor weather vulnerabilities detected. Click below to automatically reorder stops and eliminate delays.`;
    
    health.issues.slice(0, 3).forEach(iss => {
      const tag = document.createElement("span");
      tag.className = "ai-risk-tag";
      tag.textContent = iss.tag;
      tag.title = iss.message;
      tagContainer.appendChild(tag);
    });

    if (btnReroute) {
      btnReroute.style.display = "inline-flex";
      btnReroute.innerHTML = `<span>⚡ Optimize Route & Fix Delays</span>`;
    }
  }
}

// =============================================================================
// 8. MULTI-DAY DISRUPTION CONTINGENCY ENGINE
// =============================================================================

function applyDisruptionScenario(type) {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const plans = destInfo.contingencyPlans;
  const allPlaces = destInfo.places || [];
  if (!plans) return;

  state.activeDisruption = type;

  if (type === "rain" && plans.heavyRain) {
    // Comprehensive Monsoon Reroute: swap weather-sensitive places across ALL days
    const rainPool = [...plans.heavyRain.replacements];
    // Also include non-weather-sensitive core places as extended pool
    const indoorCorePlaces = allPlaces.filter(p => !p.weatherSensitive);
    const combinedPool = [...rainPool, ...indoorCorePlaces];
    let poolIdx = 0;
    let totalSwapped = 0;
    let unreplacedOutdoor = 0;

    state.itinerary.forEach((day, dIdx) => {
      let dayChanged = false;

      day.activities = day.activities.map(act => {
        if (act.weatherSensitive) {
          if (poolIdx < combinedPool.length) {
            const replacement = JSON.parse(JSON.stringify(combinedPool[poolIdx % combinedPool.length]));
            poolIdx++;
            totalSwapped++;
            dayChanged = true;
            return replacement;
          } else {
            unreplacedOutdoor++;
          }
        }
        return act;
      });

      if (dayChanged) {
        day.title = `Day ${day.dayNum}: Sheltered Indoor Highlights of ${destInfo.name}`;
        // Re-optimize and re-time the day after swapping
        day.activities = optimizeDayPath(day.activities, destInfo.centerCoords);
      }
    });

    if (unreplacedOutdoor > 0) {
      showToast(
        "Monsoon Contingency Applied (Partial) ⚠️", 
        `Swapped ${totalSwapped} outdoor stops with indoor alternatives. Note: ${unreplacedOutdoor} outdoor stop(s) remained due to limited indoor venues in this destination.`, 
        "warning"
      );
    } else {
      showToast(
        "Monsoon Contingency Applied 🌧️", 
        `Swapped ${totalSwapped} outdoor venues across all days with indoor heritage museums, covered havelis, and culinary workshops. All days re-timed!`, 
        "success"
      );
    }
  } else if (type === "delay" && plans.timeDelay) {
    // Traffic Delay / Highway Jam: keep prioritized core stops and adjust start time buffers
    const keepIds = new Set(plans.timeDelay.keepIds || []);

    state.itinerary.forEach((day) => {
      if (day.activities.length > 2) {
        const filtered = day.activities.filter(a => keepIds.has(a.id));
        if (filtered.length >= 2) {
          day.activities = filtered.slice(0, 2);
        } else {
          day.activities = day.activities.slice(0, 2);
        }
      }

      // Add time buffer: start later in the morning
      if (day.activities[0]) {
        day.activities[0].timeSlot = "Morning (10:30 AM)";
      }
      if (day.activities[1]) {
        day.activities[1].timeSlot = "Afternoon (03:30 PM)";
      }

      day.activities = optimizeDayPath(day.activities, destInfo.centerCoords);
    });

    showToast(
      "Express Delay Route Applied ⏱️", 
      "Condensed itinerary to essential crown-jewel stops with generous travel buffers to absorb flight/highway delays.", 
      "info"
    );
  } else if (type === "chill" && plans.lowEnergy) {
    // Relaxation / Wellness Mode: swap high-exertion activities across all days
    const chillPool = [...plans.lowEnergy.replacements];
    const lowExertionCore = allPlaces.filter(p => p.exertionLevel === "low");
    const combinedChillPool = [...chillPool, ...lowExertionCore];
    let poolIdx = 0;

    state.itinerary.forEach((day) => {
      let dayChanged = false;
      day.activities = day.activities.map(act => {
        if (act.exertionLevel === "high" && poolIdx < combinedChillPool.length) {
          const replacement = JSON.parse(JSON.stringify(combinedChillPool[poolIdx % combinedChillPool.length]));
          poolIdx++;
          dayChanged = true;
          return replacement;
        }
        return act;
      });

      if (dayChanged) {
        day.activities = optimizeDayPath(day.activities, destInfo.centerCoords);
      }
    });

    showToast(
      "Relaxation Mode Active 😴", 
      "Replaced uphill treks and high-exertion stops with relaxing high-tea lounges and Ayurvedic wellness spots.", 
      "success"
    );
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
    title.textContent = "Active: Monsoon / Rain Contingency";
    desc.textContent = "Outdoor viewpoints and hikes have been safely replaced with indoor heritage havelis & museums.";
  } else if (state.activeDisruption === "delay") {
    icon.textContent = "⏱️";
    title.textContent = "Active: Delay Express Mode";
    desc.textContent = "Schedule condensed to essential priority sights with time buffers to comfortably handle transit delays.";
  } else if (state.activeDisruption === "chill") {
    icon.textContent = "🧘";
    title.textContent = "Active: Relaxation & Wellness Mode";
    desc.textContent = "Pace relaxed with calm cafes, tea lounges, and spa treatments.";
  } else {
    icon.textContent = "⚡";
    title.textContent = "Trip Disruption Assistant";
    desc.textContent = "Unexpected weather, flight delay, or fatigue? Adapt your route and budget in 1 click.";
  }
}

// =============================================================================
// 9. RENDERING & UI SYNC
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
    highlightsContainer.innerHTML = destInfo.highlights.map(h => `<span class="meta-chip">✨ ${escapeHtml(h)}</span>`).join("");
  }

  // Update AI Diagnostics & Disruption Bar
  updateAiDiagnosticsUI();
  updateDisruptionBarUI();

  // Render Sub-Views
  renderDayTabs();
  renderDayContent();
  recalculateBudget();
  renderInsights();
  renderTransitView();

  // If map is currently active view, render map
  if (state.activeViewMode === "map") {
    setTimeout(initOrUpdateMap, 80);
  }
}

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

function renderDayTabs() {
  const tabsContainer = document.getElementById("days-nav-tabs");
  if (!tabsContainer) return;
  tabsContainer.innerHTML = "";

  const allTab = document.createElement("button");
  allTab.type = "button";
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
    tabBtn.type = "button";
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
  addDayBtn.type = "button";
  addDayBtn.className = "day-tab-btn";
  addDayBtn.style.borderStyle = "dashed";
  addDayBtn.innerHTML = `
    <span class="tab-day-label">Extend Trip</span>
    <span class="tab-day-title">+ Add Day</span>
    <span class="tab-day-cost">Day ${state.itinerary.length + 1}</span>
  `;
  addDayBtn.addEventListener("click", addNewDay);
  tabsContainer.appendChild(addDayBtn);
}

function renderDayContent() {
  const container = document.getElementById("day-content-area");
  if (!container) return;
  container.innerHTML = "";

  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const center = destInfo.centerCoords || [26.9124, 75.7873];

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
    const totalDayKm = calculatePathDistance(day.activities, center);
    const totalDayDriveTime = estimateDriveTimeMin(totalDayKm);

    const daySection = document.createElement("div");
    daySection.style.marginBottom = "24px";

    const header = document.createElement("div");
    header.className = "day-header-card";
    header.innerHTML = `
      <div class="day-title-group">
        <h3>Day ${day.dayNum}: ${escapeHtml(day.title.replace(/^Day \d+:\s*/, ''))}</h3>
        <p>${day.activities.length} activities planned · ${totalDayKm > 0 ? `🚗 ~${totalDayKm} km travel (~${totalDayDriveTime}m cab) · ` : ''}Estimated daily spend</p>
      </div>
      <div class="day-header-actions">
        <span class="day-subtotal-badge">Day Subtotal: ₹${dayCost.toLocaleString('en-IN')}</span>
        <button type="button" class="btn btn-secondary btn-sm" title="Optimize stop order for Day ${day.dayNum}" onclick="window.autoRerouteItinerary(${dayIndex})">
          <span>⚡ Optimize Day</span>
        </button>
        ${state.itinerary.length > 1 ? `
          <button type="button" class="btn-icon-sm delete" title="Delete this Day" onclick="window.deleteDay(${dayIndex})">
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

      const catClass = `cat-${escapeHtml(act.category || 'culture')}`;
      const catLabel = getCategoryLabel(act.category);

      actCard.innerHTML = `
        <div class="drag-handle" title="Drag to Reorder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/></svg>
        </div>

        <div class="activity-main">
          <div>
            <span class="activity-badge-category ${catClass}">${escapeHtml(catLabel)}</span>
            <span class="activity-time">⏰ ${escapeHtml(act.timeSlot || '')}</span>
          </div>
          <h4 class="activity-name">${escapeHtml(act.name)}</h4>
          ${act.description ? `<p class="activity-desc">${escapeHtml(act.description)}</p>` : ''}
          ${act.tip ? `
            <div class="activity-tip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span><strong>Tip:</strong> ${escapeHtml(act.tip)}</span>
            </div>
          ` : ''}
        </div>

        <div class="activity-right">
          <div class="cost-input-wrap" title="Click to edit activity cost">
            <span class="cost-currency">₹</span>
            <input type="number" class="cost-field" value="${Number(act.cost) || 0}" min="0" step="50" data-day="${dayIndex}" data-act="${actIndex}">
          </div>

          <div class="activity-actions">
            <button type="button" class="btn-icon-sm" title="Move Up" onclick="window.moveActivity(${dayIndex}, ${actIndex}, -1)" ${actIndex === 0 ? 'disabled style="opacity:0.3;"' : ''}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button type="button" class="btn-icon-sm" title="Move Down" onclick="window.moveActivity(${dayIndex}, ${actIndex}, 1)" ${actIndex === day.activities.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button type="button" class="btn-icon-sm" title="Edit Place Details" onclick="window.openEditActivityModal(${dayIndex}, ${actIndex})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button type="button" class="btn-icon-sm delete" title="Delete Activity" onclick="window.deleteActivity(${dayIndex}, ${actIndex})">
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

      // Render Transit / Distance Connector between consecutive stops
      if (actIndex < day.activities.length - 1) {
        const nextAct = day.activities[actIndex + 1];
        const c1 = act.coords || center;
        const c2 = nextAct.coords || center;
        const distKm = calculateDistanceKm(c1[0], c1[1], c2[0], c2[1]);
        const driveM = estimateDriveTimeMin(distKm);

        const connector = document.createElement("div");
        connector.className = "transit-connector-card";
        connector.innerHTML = `
          <div class="tc-left">
            <span>🚗</span>
            <span class="tc-badge">${distKm} km</span>
            <span>~${driveM} min cab ride</span>
          </div>
          <a href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(act.name + ' ' + destInfo.name)}&destination=${encodeURIComponent(nextAct.name + ' ' + destInfo.name)}" target="_blank" rel="noopener" class="tc-link" title="Open directions in Google Maps">
            <span>🗺️ Directions &rarr;</span>
          </a>
        `;
        actList.appendChild(connector);
      }
    });

    const addBtn = document.createElement("button");
    addBtn.type = "button";
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
// 10. LIVE LEAFLET MAP VISUALIZER
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

  daysToPlot.forEach((day) => {
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
      let coords = act.coords;
      if (!coords) {
        coords = [
          center[0] + (Math.random() - 0.5) * 0.04,
          center[1] + (Math.random() - 0.5) * 0.04
        ];
      }

      dayLatLngs.push(coords);
      allLatLngs.push(coords);

      // Custom HTML pin with Day + Stop number
      const icon = L.divIcon({
        className: 'custom-pin-wrapper',
        html: `<div class="custom-map-pin" style="background:${dayColor};">D${day.dayNum}-${actIdx + 1}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const popupHtml = `
        <div style="min-width:200px;">
          <div style="font-size:0.7rem; font-weight:700; color:${dayColor}; text-transform:uppercase;">Day ${day.dayNum} · Stop #${actIdx + 1}</div>
          <div style="font-weight:800; font-size:1rem; margin-top:2px; color:#0f172a;">${escapeHtml(act.name)}</div>
          <div style="font-size:0.78rem; color:#64748b; margin-top:3px;">⏰ ${escapeHtml(act.timeSlot)} · ₹${(Number(act.cost) || 0).toLocaleString('en-IN')}</div>
          ${act.description ? `<p style="font-size:0.75rem; color:#334155; margin-top:5px; line-height:1.35;">${escapeHtml(act.description)}</p>` : ''}
          ${act.tip ? `<div style="font-size:0.72rem; color:#d97706; background:#fef3c7; padding:4px 6px; border-radius:4px; margin-top:6px;">💡 ${escapeHtml(act.tip)}</div>` : ''}
          <div style="margin-top:10px; border-top:1px solid #e2e8f0; padding-top:6px;">
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.name + ' ' + destInfo.name)}" target="_blank" rel="noopener" style="color:#ea580c; font-weight:700; font-size:0.78rem; text-decoration:none;">Open in Google Maps &rarr;</a>
          </div>
        </div>
      `;

      const marker = L.marker(coords, { icon: icon }).bindPopup(popupHtml);

      // Permanent tooltip label above pin
      const tooltipHtml = `
        <div class="map-label-card">
          <div class="map-label-header" style="color:${dayColor};">Stop ${actIdx + 1} · Day ${day.dayNum}</div>
          <div class="map-label-title">${escapeHtml(act.name)}</div>
          <div class="map-label-meta">⏰ ${escapeHtml(act.timeSlot)} · ₹${(Number(act.cost) || 0).toLocaleString('en-IN')}</div>
        </div>
      `;

      marker.bindTooltip(tooltipHtml, {
        permanent: true,
        direction: 'top',
        offset: [0, -14],
        className: 'leaflet-custom-tooltip'
      });

      mapMarkersGroup.addLayer(marker);

      // Midpoint distance badge along polyline segment
      if (actIdx < day.activities.length - 1) {
        const nextAct = day.activities[actIdx + 1];
        const nextCoords = nextAct.coords || center;
        const distKm = calculateDistanceKm(coords[0], coords[1], nextCoords[0], nextCoords[1]);
        const driveTime = estimateDriveTimeMin(distKm);

        const midLat = (coords[0] + nextCoords[0]) / 2;
        const midLng = (coords[1] + nextCoords[1]) / 2;

        const distIcon = L.divIcon({
          className: 'map-dist-badge-wrapper',
          html: `<div class="map-distance-badge" title="Distance from Stop ${actIdx + 1} to Stop ${actIdx + 2}">🚗 ${distKm} km (~${driveTime}m)</div>`,
          iconSize: [120, 24],
          iconAnchor: [60, 12]
        });

        const distMarker = L.marker([midLat, midLng], { icon: distIcon, interactive: false });
        mapMarkersGroup.addLayer(distMarker);
      }
    });

    // Draw route connecting lines for the day
    if (dayLatLngs.length > 1) {
      const polyline = L.polyline(dayLatLngs, {
        color: dayColor,
        weight: 3.5,
        opacity: 0.85,
        dashArray: '6, 8'
      });
      mapPolylinesGroup.addLayer(polyline);
    }
  });

  // Fit bounds to markers
  if (allLatLngs.length > 0) {
    try {
      const bounds = L.latLngBounds(allLatLngs);
      mapInstance.fitBounds(bounds, { padding: [50, 50] });
    } catch (e) {
      // Handled
    }
  }

  mapInstance.invalidateSize();
}

// =============================================================================
// 11. TRANSIT & CAB BOOKING HUB
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
      <strong>✈️ Airport:</strong> ${escapeHtml(transit.airport)}<br>
      <strong>🚆 Railway:</strong> ${escapeHtml(transit.railway)}
    `;
  }

  if (avgBadge) {
    avgBadge.textContent = `Avg ₹${destInfo.avgDailyTransport}/day`;
  }

  if (localList) {
    localList.innerHTML = transit.localTransport.map(lt => `
      <div class="local-transit-item">
        <div class="lt-left">
          <span class="lt-name">${escapeHtml(lt.type)}</span>
          <span class="lt-sub">${escapeHtml(lt.bookingPartner)} · ${escapeHtml(lt.tip)}</span>
        </div>
        <div class="lt-cost">₹${Number(lt.avgCost) || 0}</div>
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
    coords: DESTINATIONS_DATA[state.destination]?.centerCoords,
    slotPreference: "morning",
    weatherSensitive: false,
    exertionLevel: "low",
    costTier: "moderate"
  };

  targetDay.activities.unshift(transitItem);
  saveToLocalStorage();
  renderDashboard();
  if (state.activeViewMode === "map") initOrUpdateMap();
  showToast("Transit Added to Day 1!", `Added "${name}" (₹${cost}) to your itinerary and budget.`, "success");
}

// =============================================================================
// 12. LIVE BUDGET TRACKER & FINANCIAL SUMMARY
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
      <div><strong>Best Season:</strong> ${escapeHtml(destInfo.bestTime)} for pleasant travel.</div>
    </div>
    <div class="insight-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      <div><strong>Local Commute:</strong> Avg ₹${destInfo.avgDailyTransport}/day for Autos, Scooters & Taxis.</div>
    </div>
    <div class="insight-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <div><strong>Hybrid TSP Optimizer:</strong> Evaluates exact permutations for minimal travel distances with zero lag.</div>
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
// 13. ACTIVITY ACTIONS: MOVE, DELETE, ADD, EDIT
// =============================================================================

function moveActivity(dayIndex, actIndex, direction) {
  const activities = state.itinerary[dayIndex].activities;
  const targetIndex = actIndex + direction;
  if (targetIndex < 0 || targetIndex >= activities.length) return;

  const temp = activities[actIndex];
  activities[actIndex] = activities[targetIndex];
  activities[targetIndex] = temp;

  saveToLocalStorage();
  renderDashboard();
  if (state.activeViewMode === "map") initOrUpdateMap();
  showToast("Reordered", `Moved activity ${direction < 0 ? 'up' : 'down'}.`, "info");
}

function deleteActivity(dayIndex, actIndex) {
  const actName = state.itinerary[dayIndex].activities[actIndex]?.name || "Activity";
  state.itinerary[dayIndex].activities.splice(actIndex, 1);
  saveToLocalStorage();
  renderDashboard();
  if (state.activeViewMode === "map") initOrUpdateMap();
  showToast("Activity Removed", `Deleted "${actName}" from Day ${state.itinerary[dayIndex].dayNum}.`, "info");
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
      coords: destInfo.centerCoords,
      slotPreference: "evening",
      weatherSensitive: true,
      exertionLevel: "low",
      costTier: "budget"
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
  renderDashboard();
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
  renderDashboard();
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
    renderDashboard();
    if (state.activeViewMode === "map") initOrUpdateMap();
    showToast("Reordered via Drag & Drop", "Moved to new position.", "info");
  });
}

// =============================================================================
// 14. MODALS & EVENT LISTENERS
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
  document.getElementById("modal-act-cost").value = Number(act.cost) || 0;
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

  // AI Co-Pilot Form Submit
  document.getElementById("form-copilot")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const promptInput = document.getElementById("input-copilot-prompt");
    if (promptInput && promptInput.value.trim()) {
      parseAndExecuteAiPrompt(promptInput.value.trim());
    }
  });

  // AI Co-Pilot Quick Prompt Chips
  document.querySelectorAll(".copilot-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const promptText = chip.dataset.prompt;
      const input = document.getElementById("input-copilot-prompt");
      if (input) input.value = promptText;
      parseAndExecuteAiPrompt(promptText);
    });
  });

  // View Mode Switcher buttons
  document.querySelectorAll(".view-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      switchViewMode(mode);
    });
  });

  // Route Optimizer Buttons
  document.getElementById("btn-ai-auto-reroute")?.addEventListener("click", () => autoRerouteItinerary(-1));
  document.getElementById("btn-map-optimize")?.addEventListener("click", () => autoRerouteItinerary(-1));
  document.getElementById("btn-map-fit-bounds")?.addEventListener("click", () => {
    if (mapInstance) {
      initOrUpdateMap();
      showToast("Map Centered", "Fitted map view to all destination stops.", "info");
    }
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
        : (state.itinerary[dayIndex].activities[actIndex].coords || DESTINATIONS_DATA[state.destination]?.centerCoords),
      slotPreference: actIndex === -1 
        ? "any" 
        : (state.itinerary[dayIndex].activities[actIndex].slotPreference || "any"),
      weatherSensitive: actIndex === -1 
        ? false 
        : (state.itinerary[dayIndex].activities[actIndex].weatherSensitive || false),
      exertionLevel: actIndex === -1 
        ? "moderate" 
        : (state.itinerary[dayIndex].activities[actIndex].exertionLevel || "moderate"),
      costTier: "moderate"
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
    renderDashboard();
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
      <div style="font-weight: 700;">${escapeHtml(title)}</div>
      <div style="font-size: 0.78rem; opacity: 0.9;">${escapeHtml(message)}</div>
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

// =============================================================================
// 15. GLOBAL WINDOW EXPORTS FOR EVENT HANDLING
// =============================================================================

window.moveActivity = moveActivity;
window.deleteActivity = deleteActivity;
window.openEditActivityModal = openEditActivityModal;
window.openAddActivityModal = openAddActivityModal;
window.deleteDay = deleteDay;
window.addNewDay = addNewDay;
window.switchViewMode = switchViewMode;
window.applyDisruptionScenario = applyDisruptionScenario;
window.addTransitActivity = addTransitActivity;
window.autoRerouteItinerary = autoRerouteItinerary;
window.parseAndExecuteAiPrompt = parseAndExecuteAiPrompt;
window.initOrUpdateMap = initOrUpdateMap;
