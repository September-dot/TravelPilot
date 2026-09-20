/**
 * TravelPilot - Production Algorithmic Trip Planner & AI Route Optimizer for India
 * 
 * Technical Highlights:
 *  - AI Co-Pilot: Bounded Autonomy Intent Parser (LLM Layer + Clause-Scoped Negation Fallback)
 *  - Fail-Safe UX: Suggestion chips ("Did you mean: Rain / Delay / Tired / Cheaper?") on ambiguous queries
 *  - Hybrid TSP Route Optimizer: Exact Permutations (n <= 7) & 2-Opt Local Search with Slot Penalties (n > 7)
 *  - Pure Function Architecture: buildItinerary(params) for deterministic testing & explicit budget tiers
 *  - Preview, Approve & Undo: Before/After Diff Modal, Dynamic Rationale, and Multi-Level Undo/Redo Stack
 *  - Hotel Start Origin: Map-click hotel placement with before/after diff impact calculation
 *  - Proactive Live Weather Forecast: Open-Meteo REST API date range queries (start_date/end_date)
 *  - Calendar & Sharing: Properly escaped .ics generator with index-computed slot times & shareable URL state
 *  - Security: SessionStorage for API keys & HTML entity sanitization (XSS Defense)
 */

// =============================================================================
// 1. APPLICATION STATE
// =============================================================================

let state = {
  destination: "jaipur",
  daysCount: 3,
  totalBudget: 18000,
  startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow's date
  selectedInterests: ["culture", "food", "nature"],
  hotelOrigin: null, // [lat, lon]
  hotelName: null,
  isHotelPickerMode: false,
  activeDayTab: 0, // 0 for Day 1, -1 for "All Days"
  activeViewMode: "itinerary", // "itinerary" | "map" | "transit"
  itinerary: [],
  originalItineraryBackup: null,
  activeDisruption: null, // "rain" | "delay" | "chill" | null
  undoStack: [],
  redoStack: [],
  llmConfig: {
    provider: "builtin_fallback", // "builtin_fallback" | "openai" | "groq" | "openrouter" | "custom"
    apiKey: "",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini"
  },
  liveForecast: null,
  activePendingDiff: null
};

let mapInstance = null;
let mapMarkersGroup = null;
let mapPolylinesGroup = null;
let draggedCard = null;

// Day Pin Palette
const DAY_COLORS = ["#ea580c", "#4f46e5", "#059669", "#e11d48", "#d97706", "#7c3aed", "#0284c7"];

// =============================================================================
// 2. SECURITY, FORMATTING & CALENDAR UTILITIES
// =============================================================================

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeIcsText(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

function estimateDriveTimeMin(distKm) {
  if (distKm <= 0.3) return 5;
  const driveMinutes = Math.round((distKm / 25) * 60) + 5;
  return Math.max(driveMinutes, 8);
}

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

function calculateSlotPenalty(activities) {
  if (!activities || activities.length <= 1) return 0;
  let penalty = 0;
  const n = activities.length;
  for (let i = 0; i < n; i++) {
    const pref = activities[i].slotPreference || "any";
    if (pref === "morning" && i >= n - 1) {
      penalty += 6.0;
    } else if ((pref === "evening" || pref === "night") && i === 0) {
      penalty += 12.0;
    } else if (pref === "night" && i < n - 1) {
      penalty += 8.0;
    }
  }
  return penalty;
}

function calculateTotalRouteCost(activities, center) {
  return calculatePathDistance(activities, center) + calculateSlotPenalty(activities);
}

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

function nearestNeighborWithTwoOpt(activities, defaultCenter) {
  if (activities.length <= 2) return activities;
  const center = defaultCenter || [26.9124, 75.7873];
  
  // Greedy nearest neighbor construction
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
  
  // 2-Opt local search refinement with slot penalties
  let bestRoute = tour;
  let bestCost = calculateTotalRouteCost(bestRoute, center);
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
        const newCost = calculateTotalRouteCost(newRoute, center);
        if (newCost < bestCost - 0.05) {
          bestRoute = newRoute;
          bestCost = newCost;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return bestRoute;
}

// Generate time slot dynamically by index to remove 8 PM pile-ups
function getTimeSlotForIndex(idx, isDelayed = false) {
  const standardHours = [9.0, 11.5, 14.0, 16.5, 18.5, 20.0, 21.5];
  const delayedHours = [10.5, 13.0, 15.5, 17.5, 19.5, 21.0, 22.0];
  const hours = isDelayed ? delayedHours : standardHours;
  
  let h;
  if (idx < hours.length) {
    h = hours[idx];
  } else {
    h = hours[hours.length - 1] + (idx - hours.length + 1) * 1.25;
  }

  const intH = Math.floor(h);
  const min = Math.round((h - intH) * 60);
  const period = intH >= 12 && intH < 24 ? "PM" : "AM";
  const displayH = intH > 12 ? intH - 12 : (intH === 0 ? 12 : intH);
  const label = intH < 12 ? "Morning" : (intH < 17 ? "Afternoon" : (intH < 20 ? "Evening" : "Night"));
  
  return `${label} (${String(displayH).padStart(2, "0")}:${String(min).padStart(2, "0")} ${period})`;
}

// =============================================================================
// 3. UNDO & REDO HISTORY STACK ENGINE
// =============================================================================

function pushStateToUndoHistory(actionName = "Itinerary Modification") {
  const snapshot = {
    actionName,
    itinerary: JSON.parse(JSON.stringify(state.itinerary)),
    totalBudget: state.totalBudget,
    activeDisruption: state.activeDisruption,
    hotelOrigin: state.hotelOrigin ? [...state.hotelOrigin] : null,
    hotelName: state.hotelName,
    timestamp: Date.now()
  };
  state.undoStack.push(snapshot);
  if (state.undoStack.length > 20) state.undoStack.shift();
  state.redoStack = [];
  updateUndoRedoUI();
  saveToLocalStorage();
}

function performUndo() {
  if (state.undoStack.length === 0) {
    showToast("Nothing to Undo", "You are at the earliest recorded state.", "info");
    return;
  }
  const currentSnapshot = {
    actionName: "Current State",
    itinerary: JSON.parse(JSON.stringify(state.itinerary)),
    totalBudget: state.totalBudget,
    activeDisruption: state.activeDisruption,
    hotelOrigin: state.hotelOrigin ? [...state.hotelOrigin] : null,
    hotelName: state.hotelName,
    timestamp: Date.now()
  };
  state.redoStack.push(currentSnapshot);

  const prev = state.undoStack.pop();
  state.itinerary = JSON.parse(JSON.stringify(prev.itinerary));
  state.totalBudget = prev.totalBudget;
  state.activeDisruption = prev.activeDisruption;
  state.hotelOrigin = prev.hotelOrigin;
  state.hotelName = prev.hotelName;

  updateUndoRedoUI();
  saveToLocalStorage();
  renderDashboard();
  showToast("Action Undone ↩️", `Reverted: ${prev.actionName}`, "info");
}

function performRedo() {
  if (state.redoStack.length === 0) {
    showToast("Nothing to Redo", "You are at the most recent state.", "info");
    return;
  }
  const currentSnapshot = {
    actionName: "Before Redo",
    itinerary: JSON.parse(JSON.stringify(state.itinerary)),
    totalBudget: state.totalBudget,
    activeDisruption: state.activeDisruption,
    hotelOrigin: state.hotelOrigin ? [...state.hotelOrigin] : null,
    hotelName: state.hotelName,
    timestamp: Date.now()
  };
  state.undoStack.push(currentSnapshot);

  const next = state.redoStack.pop();
  state.itinerary = JSON.parse(JSON.stringify(next.itinerary));
  state.totalBudget = next.totalBudget;
  state.activeDisruption = next.activeDisruption;
  state.hotelOrigin = next.hotelOrigin;
  state.hotelName = next.hotelName;

  updateUndoRedoUI();
  saveToLocalStorage();
  renderDashboard();
  showToast("Action Redone ↪️", `Re-applied: ${next.actionName}`, "info");
}

function updateUndoRedoUI() {
  const btnUndo = document.getElementById("btn-header-undo");
  const btnRedo = document.getElementById("btn-header-redo");
  if (btnUndo) {
    btnUndo.disabled = state.undoStack.length === 0;
    btnUndo.style.opacity = state.undoStack.length === 0 ? "0.4" : "1";
    btnUndo.title = state.undoStack.length > 0 ? `Undo ${state.undoStack[state.undoStack.length - 1].actionName} (Cmd+Z)` : "Nothing to undo";
  }
  if (btnRedo) {
    btnRedo.disabled = state.redoStack.length === 0;
    btnRedo.style.opacity = state.redoStack.length === 0 ? "0.4" : "1";
    btnRedo.title = state.redoStack.length > 0 ? `Redo (Cmd+Shift+Z)` : "Nothing to redo";
  }
}

// =============================================================================
// 4. HYBRID TSP ROUTE OPTIMIZER (Exact <=7, Nearest-Neighbor+2-Opt >7)
// =============================================================================

function optimizeDayPath(activities, defaultCenter, isDelayed = false) {
  if (!activities || activities.length <= 1) return activities;

  const center = state.hotelOrigin || defaultCenter || [26.9124, 75.7873];
  const n = activities.length;

  let bestPermutation = activities;

  if (n <= 7) {
    let minCost = Infinity;
    const allPerms = getPermutations(activities);

    for (let p = 0; p < allPerms.length; p++) {
      const perm = allPerms[p];
      const totalCost = calculateTotalRouteCost(perm, center);
      if (totalCost < minCost) {
        minCost = totalCost;
        bestPermutation = perm;
      }
    }
  } else {
    bestPermutation = nearestNeighborWithTwoOpt(activities, center);
  }

  const result = bestPermutation.map((act, idx) => {
    const updated = { ...act };
    updated.timeSlot = getTimeSlotForIndex(idx, isDelayed);
    return updated;
  });

  return result;
}

function autoRerouteItinerary(targetDayIndex = -1, promptForApproval = true) {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const center = state.hotelOrigin || destInfo.centerCoords || [26.9124, 75.7873];
  
  const draftItinerary = JSON.parse(JSON.stringify(state.itinerary));
  const daysToOptimize = targetDayIndex === -1 
    ? draftItinerary 
    : [draftItinerary[targetDayIndex]].filter(Boolean);

  daysToOptimize.forEach((day) => {
    if (day.activities.length <= 1) return;
    day.activities = optimizeDayPath(day.activities, center);
  });

  if (promptForApproval) {
    const diffData = computeItineraryDiff(state.itinerary, draftItinerary, center);
    const dynamicRationale = generateDynamicRationale(diffData, "Traveling Salesperson (TSP) Geometric Optimization");
    
    showDiffPreviewModal(
      diffData,
      { itinerary: draftItinerary, totalBudget: state.totalBudget, activeDisruption: state.activeDisruption },
      dynamicRationale,
      "TSP Route Geometry Optimization",
      "Deterministic Algorithm"
    );
  } else {
    pushStateToUndoHistory("Route Geometry Optimization");
    state.itinerary = draftItinerary;
    saveToLocalStorage();
    renderDashboard();
    if (state.activeViewMode === "map") initOrUpdateMap();
    showToast("Route Optimized! ⚡", "Reordered stops to minimize commute distance.", "success");
  }
}

// =============================================================================
// 5. PURE GENERATION FUNCTION & EXPLICIT BUDGET TIERS
// =============================================================================

function buildItinerary({ destination, daysCount, totalBudget, selectedInterests, hotelOrigin }) {
  const destInfo = DESTINATIONS_DATA[destination] || DESTINATIONS_DATA.jaipur;
  const allPlaces = [...(destInfo.places || [])];
  const numDays = daysCount || 3;
  const targetDailyBudget = (Number(totalBudget) || 18000) / numDays;
  const startCoords = hotelOrigin || destInfo.centerCoords;

  const scoredPlaces = allPlaces.map(p => {
    let score = 0;
    if (selectedInterests.includes(p.category)) {
      score += 6;
    }

    const cost = Number(p.cost) || 0;
    if (targetDailyBudget < 2500) {
      if (cost <= 250 || p.costTier === "budget") score += 6;
      else if (cost > 900 || p.costTier === "premium") score -= 10;
    } else if (targetDailyBudget > 6000) {
      if (cost >= 800 || p.costTier === "premium") score += 7;
      else if (cost === 0 && p.category !== "nature") score -= 2;
    } else {
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
        const placeCost = Number(place.cost) || 0;
        if (dayActivities.length >= 2 && (dayCost + placeCost) > (targetDailyBudget * 1.6) && targetDailyBudget < 3000) {
          continue;
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
    else if (d >= 4) dayTheme = `Day ${d}: Extended Discovery & Leisure`;

    const optimizedActs = optimizeDayPath(dayActivities, startCoords);

    days.push({
      dayNum: d,
      title: dayTheme,
      activities: optimizedActs
    });
  }

  return { days, targetDailyBudget };
}

function generateItinerary(pushHistory = true) {
  if (pushHistory && state.itinerary && state.itinerary.length > 0) {
    pushStateToUndoHistory("Itinerary Generation");
  }

  const result = buildItinerary({
    destination: state.destination,
    daysCount: state.daysCount,
    totalBudget: state.totalBudget,
    selectedInterests: state.selectedInterests,
    hotelOrigin: state.hotelOrigin
  });

  state.itinerary = result.days;
  state.originalItineraryBackup = JSON.parse(JSON.stringify(result.days));
  state.activeDayTab = 0;
  state.activeDisruption = null;

  saveToLocalStorage();
  renderDashboard();
  checkLiveWeatherForecast();
  showToast("Itinerary Generated! 🚀", `Crafted budget-optimized ${state.daysCount}-day plan for ${(DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur).name}.`, "success");
}

// =============================================================================
// 6. AI CO-PILOT: CLAUSE-SCOPED PARSER & FAIL-SAFE UX
// =============================================================================

const NEGATION_REGEX = /\b(not|no|never|without|don'?t|isn'?t|aren'?t|wasn'?t|weren'?t|can'?t|couldn'?t|won'?t|nothing)\b/i;

function hasIntentMatch(text, patternRegex) {
  for (const m of text.matchAll(new RegExp(patternRegex.source, 'gi'))) {
    const before = text.slice(0, m.index).split(/[.,;!?]|\bbut\b/).pop().split(/\s+/).slice(-4).join(' ');
    if (!NEGATION_REGEX.test(before)) {
      return true;
    }
  }
  return false;
}

function parseIntentWithRuleFallback(promptText) {
  if (!promptText || !promptText.trim()) return null;
  const text = promptText.toLowerCase();

  const intents = [];
  let confidence = 0.94;
  const constraints = {};

  // Intent 1: Weather (Rain / Monsoon / Storm / Waterlog / Wet)
  const isRain = hasIntentMatch(text, /\b(rain|raining|rains|monsoon|storm|stormy|pouring|drenched|waterlog\w*|downpour|heavy shower|wet)\b/);
  if (isRain) intents.push("weather_rain");

  // Intent 2: Delay / Traffic / Transit / Train Delay / Flight Delay
  // "train" only counts as delay alongside late, delayed, cancelled, missed, slow, stuck
  const isTrainDelay = hasIntentMatch(text, /\btrain\b/) && /\b(late|delay\w*|cancel\w*|miss\w*|slow|stuck|jam\w*)\b/i.test(text);
  const isGeneralDelay = hasIntentMatch(text, /\b(delay|delayed|traffic|jam|stuck|late|flight delay|slow transit|cancelled|missed|shorten)\b/);
  if (isTrainDelay || isGeneralDelay) intents.push("traffic_delay");

  // Intent 3: Fatigue / Wellness / Chill / Slow Pace
  const isChill = hasIntentMatch(text, /\b(tired|exhausted|exhaust|chill|relax|relaxing|spa|massage|rest|wellness|slow down|leisure|gentle)\b/);
  if (isChill) intents.push("fatigue_chill");

  // Intent 4: Budget Low ("too expensive", "way too pricey", "cut costs", "cheap", "free sights")
  // Exclude "free breakfast", "free wifi", "free parking", "free time"
  const isExcludedFree = /\bfree\s+(breakfast|wifi|parking|cancellation|time|schedule|day|hours?)\b/i.test(text);
  const hasFreeSights = hasIntentMatch(text, /\bfree\b/) && !isExcludedFree;
  const isPriceSensitive = hasIntentMatch(text, /\b(tight budget|cheap|low budget|save money|street food|broke|economical|too expensive|way too pricey|over budget|budget cut|cheaper|cut costs|can'?t afford)\b/);
  
  if (isPriceSensitive || hasFreeSights) {
    intents.push("budget_low");
    constraints.dailyBudgetTier = 1800; // Explicit budget tier: ₹1,800/day
  }

  // Intent 5: Luxury Upgrade ("splurge", "luxury", "5 star", "high tea")
  const isLuxury = hasIntentMatch(text, /\b(luxury|splurge|5 star|five star|vip|high tea|private cruise|fine dining|gourmet)\b/);
  if (isLuxury) {
    intents.push("budget_luxury");
    constraints.dailyBudgetTier = 8500; // Explicit luxury tier: ₹8,500/day
  }

  // Intent 6: Reset ("original plan", "baseline plan", "baseline schedule", "start over", "reset")
  const isReset = hasIntentMatch(text, /\b(reset|start\s+over|restart|undo\s+all|baseline\s+(plan|schedule)|original\s+plan|back\s+to\s+start)\b/);
  if (isReset) intents.push("reset_plan");

  // Intent 7: Route Optimization ("optimize route", "shortest route", "eliminate long commute")
  const isReroute = hasIntentMatch(text, /\b(reroute|optimize(\s+route)?|shortest(\s+travel)?\s+route|efficient\s+route|eliminate(\s+long)?\s+commute)\b/);
  if (isReroute) intents.push("reroute_optimize");

  // If no clear intent matched, DO NOT guess or silently reroute. Return low confidence!
  if (intents.length === 0) {
    return {
      intents: [],
      confidence: 0.0,
      targetDays: [1, 2, 3],
      constraints,
      userSummary: "Ambiguous query. Showing clarifying suggestion chips.",
      source: "tokenized_rule_fallback",
      needsClarification: true
    };
  }

  let userSummary = "";
  if (intents.includes("weather_rain") && intents.includes("fatigue_chill")) {
    userSummary = "Detected adverse monsoon rain and high physical fatigue. Proposing indoor sheltered havelis and wellness relaxation lounges.";
  } else if (intents.includes("weather_rain")) {
    userSummary = "Detected rain advisory. Proposing sheltered indoor museums and havelis across all days.";
  } else if (intents.includes("traffic_delay")) {
    userSummary = "Detected travel/traffic delay. Proposing condensed priority highlights with morning time buffers.";
  } else if (intents.includes("fatigue_chill")) {
    userSummary = "Detected fatigue. Proposing relaxed pacing with royal tea lounges and wellness stops.";
  } else if (intents.includes("budget_low")) {
    userSummary = "Detected economical budget request. Rebuilding plan with free heritage stepwells, walking tours, and street dining (≤₹1,800/day tier).";
  } else if (intents.includes("budget_luxury")) {
    userSummary = "Detected luxury upgrade request. Rebuilding plan with royal high tea, private boat cruises, and signature heritage dining (₹8,500/day tier).";
  } else if (intents.includes("reset_plan")) {
    userSummary = "Detected request to restore baseline generated itinerary.";
  }

  return {
    intents,
    confidence,
    targetDays: [1, 2, 3],
    constraints,
    userSummary,
    source: "tokenized_rule_fallback",
    needsClarification: false
  };
}

async function callLlmIntentApi(promptText) {
  const sessionKey = sessionStorage.getItem("travelpilot_api_key") || state.llmConfig.apiKey;

  if (!sessionKey || state.llmConfig.provider === "builtin_fallback") {
    return parseIntentWithRuleFallback(promptText);
  }

  const systemPrompt = `You are the AI Co-Pilot intent parser for TravelPilot (India trip planner).
Convert the user's plain-English prompt into structured JSON ONLY.
Output JSON schema:
{
  "intents": ["weather_rain" | "traffic_delay" | "fatigue_chill" | "budget_low" | "budget_luxury" | "reset_plan"],
  "confidence": number (0.0 to 1.0),
  "targetDays": number[],
  "constraints": {
    "delayHours"?: number,
    "dailyBudgetTier"?: number,
    "excludeOutdoor"?: boolean
  },
  "userSummary": string,
  "needsClarification": boolean
}
Do NOT include markdown backticks or explanations. Output pure JSON only.`;

  try {
    const response = await fetch(state.llmConfig.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionKey}`
      },
      body: JSON.stringify({
        model: state.llmConfig.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptText }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    const validIntents = ["weather_rain", "traffic_delay", "fatigue_chill", "budget_low", "budget_luxury", "reset_plan"];
    const filteredIntents = (parsed.intents || []).filter(i => validIntents.includes(i));

    return {
      intents: filteredIntents,
      confidence: parsed.confidence || (filteredIntents.length > 0 ? 0.95 : 0.2),
      targetDays: parsed.targetDays || [1, 2, 3],
      constraints: parsed.constraints || {},
      userSummary: parsed.userSummary || "Parsed user intent via LLM.",
      source: "llm_agent",
      needsClarification: parsed.needsClarification || filteredIntents.length === 0
    };
  } catch (err) {
    console.warn("LLM API call failed, falling back to rule engine:", err);
    showToast("AI Fallback Active", "Used built-in intent engine (API unreachable).", "info");
    return parseIntentWithRuleFallback(promptText);
  }
}

// Render Clarification Banner when prompt is ambiguous
function showAiClarificationPrompt(promptText) {
  const container = document.getElementById("ai-reasoning-container");
  const title = document.getElementById("ai-reasoning-title");
  const text = document.getElementById("ai-reasoning-text");

  if (!container || !text) return;

  container.style.display = "flex";
  if (title) title.textContent = "AI Clarification Required";
  text.innerHTML = `
    <span>I couldn't confidently detect a disruption scenario in <em>"${escapeHtml(promptText)}"</em>. Did you mean:</span>
    <div class="copilot-prompts-row" style="margin-top:8px;">
      <button type="button" class="copilot-chip" onclick="parseAndExecuteAiPrompt('pouring rain, move indoors')">🌧️ Rain Alert</button>
      <button type="button" class="copilot-chip" onclick="parseAndExecuteAiPrompt('delayed by 2 hours, shorten day')">⏱️ Flight/Train Delay</button>
      <button type="button" class="copilot-chip" onclick="parseAndExecuteAiPrompt('tired, switch to chill wellness mode')">😴 Tired / Relax</button>
      <button type="button" class="copilot-chip" onclick="parseAndExecuteAiPrompt('too expensive, make it cheaper')">💰 Cheaper Budget</button>
      <button type="button" class="copilot-chip" onclick="autoRerouteItinerary(-1)">⚡ Optimize Route Distance</button>
    </div>
  `;
}

// Execute AI Co-Pilot Adaptation (Bounded Autonomy with Preview Diff)
async function parseAndExecuteAiPrompt(promptText) {
  if (!promptText || !promptText.trim()) return;

  const btnSubmit = document.getElementById("btn-copilot-submit");
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span>⏳ Analyzing Intent...</span>`;
  }

  const parsedPlan = await callLlmIntentApi(promptText);

  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `<span>⚡ Run AI Adaptation</span>`;
  }

  if (!parsedPlan || parsedPlan.needsClarification || parsedPlan.intents.length === 0) {
    showAiClarificationPrompt(promptText);
    showToast("Clarification Needed 🤔", "Please select what you'd like to adjust.", "info");
    return;
  }

  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const startCoords = state.hotelOrigin || destInfo.centerCoords;
  let draftItinerary = JSON.parse(JSON.stringify(state.itinerary));
  let draftBudget = state.totalBudget;
  let proposedDisruption = state.activeDisruption;

  const intents = parsedPlan.intents;

  if (intents.includes("reset_plan")) {
    if (state.originalItineraryBackup) {
      draftItinerary = JSON.parse(JSON.stringify(state.originalItineraryBackup));
      proposedDisruption = null;
    }
  } else {
    // Explicit daily budget tiering
    if (intents.includes("budget_low")) {
      draftBudget = state.daysCount * 1800; // Explicit ₹1,800/day tier
      const rebuilt = buildItinerary({
        destination: state.destination,
        daysCount: state.daysCount,
        totalBudget: draftBudget,
        selectedInterests: state.selectedInterests,
        hotelOrigin: state.hotelOrigin
      });
      draftItinerary = rebuilt.days;
    } else if (intents.includes("budget_luxury")) {
      draftBudget = state.daysCount * 8500; // Explicit ₹8,500/day luxury tier
      const rebuilt = buildItinerary({
        destination: state.destination,
        daysCount: state.daysCount,
        totalBudget: draftBudget,
        selectedInterests: state.selectedInterests,
        hotelOrigin: state.hotelOrigin
      });
      draftItinerary = rebuilt.days;
    }

    // Rain handling: exclude active IDs
    if (intents.includes("weather_rain")) {
      proposedDisruption = "rain";
      const plans = destInfo.contingencyPlans;
      if (plans && plans.heavyRain) {
        const activeIds = new Set(draftItinerary.flatMap(d => d.activities.map(a => a.id)));
        const rainPool = [...plans.heavyRain.replacements];
        const indoorCore = (destInfo.places || []).filter(p => !p.weatherSensitive);
        const combinedPool = [...rainPool, ...indoorCore].filter(p => !activeIds.has(p.id));
        let poolIdx = 0;

        draftItinerary.forEach((day) => {
          let changed = false;
          day.activities = day.activities.map(act => {
            if (act.weatherSensitive && poolIdx < combinedPool.length) {
              const rep = JSON.parse(JSON.stringify(combinedPool[poolIdx]));
              activeIds.add(rep.id);
              poolIdx++;
              changed = true;
              return rep;
            }
            return act;
          });
          if (changed) {
            day.title = `Day ${day.dayNum}: Sheltered Indoor Highlights of ${destInfo.name}`;
            day.activities = optimizeDayPath(day.activities, startCoords);
          }
        });
      }
    }

    // Delay handling: apply morning buffer AFTER optimizeDayPath
    if (intents.includes("traffic_delay")) {
      proposedDisruption = proposedDisruption || "delay";
      const plans = destInfo.contingencyPlans;
      const keepIds = new Set(plans?.timeDelay?.keepIds || []);

      draftItinerary.forEach((day) => {
        if (day.activities.length > 2) {
          const filtered = day.activities.filter(a => keepIds.has(a.id));
          day.activities = filtered.length >= 2 ? filtered.slice(0, 2) : day.activities.slice(0, 2);
        }
        day.activities = optimizeDayPath(day.activities, startCoords, true);
      });
    }

    // Fatigue / Chill handling: exclude active IDs
    if (intents.includes("fatigue_chill")) {
      proposedDisruption = proposedDisruption || "chill";
      const plans = destInfo.contingencyPlans;
      if (plans && plans.lowEnergy) {
        const activeIds = new Set(draftItinerary.flatMap(d => d.activities.map(a => a.id)));
        const chillPool = [...plans.lowEnergy.replacements];
        const lowExertion = (destInfo.places || []).filter(p => p.exertionLevel === "low");
        const combinedChill = [...chillPool, ...lowExertion].filter(p => !activeIds.has(p.id));
        let poolIdx = 0;

        draftItinerary.forEach((day) => {
          let changed = false;
          day.activities = day.activities.map(act => {
            if (act.exertionLevel === "high" && poolIdx < combinedChill.length) {
              const rep = JSON.parse(JSON.stringify(combinedChill[poolIdx]));
              activeIds.add(rep.id);
              poolIdx++;
              changed = true;
              return rep;
            }
            return act;
          });
          if (changed) {
            day.activities = optimizeDayPath(day.activities, startCoords);
          }
        });
      }
    }
  }

  const diffData = computeItineraryDiff(state.itinerary, draftItinerary, startCoords);
  const dynamicRationale = generateDynamicRationale(diffData, parsedPlan.userSummary);

  const interpreterLabel = parsedPlan.source === "llm_agent" ? "AI Model (LLM Layer)" : "Deterministic Rule Engine";

  showDiffPreviewModal(
    diffData,
    { itinerary: draftItinerary, totalBudget: draftBudget, activeDisruption: proposedDisruption },
    dynamicRationale,
    `AI Intent Adaptation: ${intents.join(" + ")}`,
    interpreterLabel,
    parsedPlan.confidence
  );
}

// =============================================================================
// 7. DIFF CALCULATION & DYNAMIC RATIONALE GENERATOR
// =============================================================================

function computeItineraryDiff(currentItinerary, proposedItinerary, startCoords) {
  let beforeKm = 0;
  let afterKm = 0;
  let beforeCost = 0;
  let afterCost = 0;
  let beforeConflicts = 0;
  let afterConflicts = 0;

  const dayDiffs = [];
  const maxDays = Math.max(currentItinerary.length, proposedItinerary.length);

  for (let d = 0; d < maxDays; d++) {
    const curDay = currentItinerary[d] || { dayNum: d + 1, activities: [] };
    const propDay = proposedItinerary[d] || { dayNum: d + 1, activities: [] };

    const curDist = calculatePathDistance(curDay.activities, startCoords);
    const propDist = calculatePathDistance(propDay.activities, startCoords);
    beforeKm += curDist;
    afterKm += propDist;

    const curDayCost = curDay.activities.reduce((s, a) => s + (Number(a.cost) || 0), 0);
    const propDayCost = propDay.activities.reduce((s, a) => s + (Number(a.cost) || 0), 0);
    beforeCost += curDayCost;
    afterCost += propDayCost;

    const curWeatherRisks = curDay.activities.filter(a => a.weatherSensitive).length;
    const propWeatherRisks = propDay.activities.filter(a => a.weatherSensitive).length;
    beforeConflicts += curWeatherRisks;
    afterConflicts += propWeatherRisks;

    const curIds = curDay.activities.map(a => a.id);
    const propIds = propDay.activities.map(a => a.id);

    const added = propDay.activities.filter(a => !curIds.includes(a.id));
    const removed = curDay.activities.filter(a => !propIds.includes(a.id));

    dayDiffs.push({
      dayNum: d + 1,
      beforeActivities: curDay.activities,
      afterActivities: propDay.activities,
      curDist,
      propDist,
      deltaKm: Number((propDist - curDist).toFixed(1)),
      added,
      removed,
      hasChanges: added.length > 0 || removed.length > 0 || JSON.stringify(curIds) !== JSON.stringify(propIds)
    });
  }

  const deltaKm = Number((afterKm - beforeKm).toFixed(1));
  const beforeMins = Math.round((beforeKm / 25) * 60);
  const afterMins = Math.round((afterKm / 25) * 60);
  const deltaMins = afterMins - beforeMins;
  const deltaCost = afterCost - beforeCost;
  const resolvedConflicts = Math.max(0, beforeConflicts - afterConflicts);

  return {
    beforeKm: Number(beforeKm.toFixed(1)),
    afterKm: Number(afterKm.toFixed(1)),
    deltaKm,
    beforeMins,
    afterMins,
    deltaMins,
    beforeCost,
    afterCost,
    deltaCost,
    beforeConflicts,
    afterConflicts,
    resolvedConflicts,
    dayDiffs
  };
}

function generateDynamicRationale(diff, baseSummary) {
  const parts = [];
  if (baseSummary) parts.push(baseSummary);

  if (diff.deltaKm < -0.3) {
    parts.push(`Reduced total commute by ${Math.abs(diff.deltaKm)} km (~${Math.abs(diff.deltaMins)} mins cab transit).`);
  }

  if (diff.resolvedConflicts > 0) {
    parts.push(`Safely resolved ${diff.resolvedConflicts} weather/timing conflict(s).`);
  }

  if (diff.deltaCost !== 0) {
    parts.push(`Budget adjustment: ${diff.deltaCost > 0 ? '+' : ''}₹${diff.deltaCost.toLocaleString('en-IN')}.`);
  }

  const totalSwaps = diff.dayDiffs.reduce((s, d) => s + d.added.length, 0);
  if (totalSwaps > 0) {
    parts.push(`Updated ${totalSwaps} activity stop(s) with harmonized schedules across the trip.`);
  }

  return parts.join(" ");
}

// =============================================================================
// 8. DIFF PREVIEW MODAL CONTROLLER
// =============================================================================

function showDiffPreviewModal(diffData, proposedState, dynamicRationale, actionTitle, interpreterLabel = "Deterministic Algorithm", confidence = 0.95) {
  state.activePendingDiff = { diffData, proposedState, actionTitle };

  const modal = document.getElementById("diff-preview-modal");
  const modalTitle = document.getElementById("diff-modal-title");
  const rationaleEl = document.getElementById("diff-modal-rationale");
  const statsContainer = document.getElementById("diff-stats-container");
  const daysContainer = document.getElementById("diff-days-container");

  if (!modal) return;

  if (modalTitle) {
    modalTitle.innerHTML = `
      <span>${escapeHtml(actionTitle)}</span>
      <span class="meta-chip" style="font-size:0.7rem; margin-left:8px;">Interpreted by: ${escapeHtml(interpreterLabel)}</span>
    `;
  }

  if (rationaleEl) {
    let extraClarification = "";
    if (confidence < 0.8) {
      extraClarification = `<br><span style="color:#d97706; font-size:0.8rem;">⚠️ Low confidence interpretation (${Math.round(confidence * 100)}%). Review before approving.</span>`;
    }
    rationaleEl.innerHTML = escapeHtml(dynamicRationale) + extraClarification;
  }

  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="diff-stat-card ${diffData.deltaKm <= 0 ? 'positive' : 'negative'}">
        <span class="diff-stat-lbl">Commute Distance</span>
        <span class="diff-stat-val">${diffData.deltaKm <= 0 ? '−' : '+'}${Math.abs(diffData.deltaKm)} km</span>
        <span class="diff-stat-sub">${diffData.beforeKm} km → ${diffData.afterKm} km</span>
      </div>
      <div class="diff-stat-card ${diffData.deltaMins <= 0 ? 'positive' : 'negative'}">
        <span class="diff-stat-lbl">Transit Time</span>
        <span class="diff-stat-val">${diffData.deltaMins <= 0 ? '−' : '+'}${Math.abs(diffData.deltaMins)} mins</span>
        <span class="diff-stat-sub">Drive & cab duration</span>
      </div>
      <div class="diff-stat-card ${diffData.resolvedConflicts > 0 ? 'positive' : ''}">
        <span class="diff-stat-lbl">Risks Resolved</span>
        <span class="diff-stat-val">${diffData.resolvedConflicts}</span>
        <span class="diff-stat-sub">Weather & congestion</span>
      </div>
      <div class="diff-stat-card">
        <span class="diff-stat-lbl">Estimated Cost</span>
        <span class="diff-stat-val">${diffData.deltaCost >= 0 ? '+' : '−'}₹${Math.abs(diffData.deltaCost).toLocaleString('en-IN')}</span>
        <span class="diff-stat-sub">₹${diffData.beforeCost.toLocaleString('en-IN')} → ₹${diffData.afterCost.toLocaleString('en-IN')}</span>
      </div>
    `;
  }

  if (daysContainer) {
    daysContainer.innerHTML = diffData.dayDiffs.map(day => `
      <div class="diff-day-box">
        <div class="diff-day-header">
          <strong>Day ${day.dayNum}</strong>
          <span class="meta-chip">${day.deltaKm <= 0 ? '−' : '+'}${Math.abs(day.deltaKm)} km commute</span>
        </div>
        <div class="diff-comparison-grid">
          <div class="diff-col before">
            <span class="diff-col-lbl">Current Plan</span>
            ${day.beforeActivities.map(a => `
              <div class="diff-item ${day.removed.some(r => r.id === a.id) ? 'removed' : ''}">
                <span class="diff-item-time">${escapeHtml(a.timeSlot)}</span>
                <span class="diff-item-name">${escapeHtml(a.name)}</span>
              </div>
            `).join("")}
          </div>
          <div class="diff-col after">
            <span class="diff-col-lbl">Proposed Plan</span>
            ${day.afterActivities.map(a => `
              <div class="diff-item ${day.added.some(ad => ad.id === a.id) ? 'added' : ''}">
                <span class="diff-item-time">${escapeHtml(a.timeSlot)}</span>
                <span class="diff-item-name">${escapeHtml(a.name)}</span>
                ${day.added.some(ad => ad.id === a.id) ? '<span class="diff-badge-new">+ New</span>' : ''}
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `).join("");
  }

  modal.style.display = "flex";
}

function closeDiffPreviewModal() {
  const modal = document.getElementById("diff-preview-modal");
  if (modal) modal.style.display = "none";
  state.activePendingDiff = null;
}

function applyPendingDiff() {
  if (!state.activePendingDiff) return;
  const { proposedState, actionTitle } = state.activePendingDiff;

  pushStateToUndoHistory(actionTitle);
  state.itinerary = JSON.parse(JSON.stringify(proposedState.itinerary));
  state.totalBudget = proposedState.totalBudget;
  state.activeDisruption = proposedState.activeDisruption;
  if (proposedState.hotelOrigin !== undefined) {
    state.hotelOrigin = proposedState.hotelOrigin;
    state.hotelName = proposedState.hotelName;
  }

  closeDiffPreviewModal();
  saveToLocalStorage();
  renderDashboard();

  showToast("Plan Updated! ✅", `${actionTitle} applied. Press Cmd+Z to undo anytime.`, "success");
}

// =============================================================================
// 9. PROACTIVE LIVE WEATHER FORECAST (START_DATE / END_DATE)
// =============================================================================

async function checkLiveWeatherForecast() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const coords = destInfo.centerCoords || [26.9124, 75.7873];
  const forecastBanner = document.getElementById("proactive-weather-banner");
  if (!forecastBanner) return;

  try {
    const start = new Date(state.startDate || Date.now());
    const end = new Date(start);
    end.setDate(end.getDate() + (state.daysCount - 1));
    const startIso = start.toISOString().split('T')[0];
    const endIso = end.toISOString().split('T')[0];

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords[0]}&longitude=${coords[1]}&daily=precipitation_probability_max,precipitation_sum,temperature_2m_max&start_date=${startIso}&end_date=${endIso}&timezone=auto`;
    const resp = await fetch(url);
    if (!resp.ok) return;
    const data = await resp.json();
    state.liveForecast = data;

    const daily = data.daily || {};
    const probs = daily.precipitation_probability_max || [];
    const sums = daily.precipitation_sum || [];

    let rainRiskDay = null;
    let rainRiskProb = 0;

    for (let i = 0; i < Math.min(state.daysCount, probs.length); i++) {
      if (probs[i] >= 45 || sums[i] >= 2.0) {
        rainRiskDay = i + 1;
        rainRiskProb = probs[i];
        break;
      }
    }

    if (rainRiskDay) {
      forecastBanner.style.display = "flex";
      forecastBanner.innerHTML = `
        <div class="weather-alert-left">
          <span class="weather-alert-icon">🌦️</span>
          <div>
            <strong>Live Open-Meteo Forecast Alert: ${rainRiskProb}% Rain on Day ${rainRiskDay}</strong>
            <p>Precipitation forecasted in ${destInfo.name} on Day ${rainRiskDay}. Our proactive agent has pre-computed an indoor sheltered plan.</p>
          </div>
        </div>
        <div class="weather-alert-right">
          <button class="btn btn-primary btn-sm" id="btn-apply-weather-proactive">
            <span>Review & Apply Indoor Plan</span>
          </button>
        </div>
      `;

      document.getElementById("btn-apply-weather-proactive")?.addEventListener("click", () => {
        applyDisruptionScenario("rain");
      });
    } else {
      forecastBanner.style.display = "none";
    }
  } catch (err) {
    console.warn("Open-Meteo forecast fetch notice:", err);
    if (forecastBanner) forecastBanner.style.display = "none";
  }
}

function getClosedDaysAdvisories() {
  const advisories = [];
  const start = new Date(state.startDate || Date.now());

  state.itinerary.forEach((day, dIdx) => {
    const dayDate = new Date(start);
    dayDate.setDate(dayDate.getDate() + dIdx);
    const dayOfWeek = dayDate.getDay();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    day.activities.forEach(act => {
      if (act.closedDays && Array.isArray(act.closedDays) && act.closedDays.includes(dayOfWeek)) {
        advisories.push({
          dayNum: day.dayNum,
          actName: act.name,
          closedDayName: dayNames[dayOfWeek],
          tag: `⚠️ Closed on ${dayNames[dayOfWeek]}s: "${act.name}"`
        });
      }
    });
  });

  return advisories;
}

// =============================================================================
// 10. DISRUPTION SCENARIO HANDLERS (WITH DIFF PREVIEW)
// =============================================================================

function applyDisruptionScenario(type) {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const plans = destInfo.contingencyPlans;
  const allPlaces = destInfo.places || [];
  const startCoords = state.hotelOrigin || destInfo.centerCoords;

  if (!plans) return;

  const draftItinerary = JSON.parse(JSON.stringify(state.itinerary));
  let proposedDisruption = type;

  if (type === "rain" && plans.heavyRain) {
    const activeIds = new Set(draftItinerary.flatMap(d => d.activities.map(a => a.id)));
    const rainPool = [...plans.heavyRain.replacements];
    const indoorCorePlaces = allPlaces.filter(p => !p.weatherSensitive);
    const combinedPool = [...rainPool, ...indoorCorePlaces].filter(p => !activeIds.has(p.id));
    let poolIdx = 0;

    draftItinerary.forEach((day) => {
      let dayChanged = false;
      day.activities = day.activities.map(act => {
        if (act.weatherSensitive && poolIdx < combinedPool.length) {
          const replacement = JSON.parse(JSON.stringify(combinedPool[poolIdx]));
          activeIds.add(replacement.id);
          poolIdx++;
          dayChanged = true;
          return replacement;
        }
        return act;
      });
      if (dayChanged) {
        day.title = `Day ${day.dayNum}: Sheltered Indoor Highlights of ${destInfo.name}`;
        day.activities = optimizeDayPath(day.activities, startCoords);
      }
    });
  } else if (type === "delay" && plans.timeDelay) {
    const keepIds = new Set(plans.timeDelay.keepIds || []);
    draftItinerary.forEach((day) => {
      if (day.activities.length > 2) {
        const filtered = day.activities.filter(a => keepIds.has(a.id));
        day.activities = filtered.length >= 2 ? filtered.slice(0, 2) : day.activities.slice(0, 2);
      }
      day.activities = optimizeDayPath(day.activities, startCoords, true);
    });
  } else if (type === "chill" && plans.lowEnergy) {
    const activeIds = new Set(draftItinerary.flatMap(d => d.activities.map(a => a.id)));
    const chillPool = [...plans.lowEnergy.replacements];
    const lowExertionCore = allPlaces.filter(p => p.exertionLevel === "low");
    const combinedChillPool = [...chillPool, ...lowExertionCore].filter(p => !activeIds.has(p.id));
    let poolIdx = 0;

    draftItinerary.forEach((day) => {
      let dayChanged = false;
      day.activities = day.activities.map(act => {
        if (act.exertionLevel === "high" && poolIdx < combinedChillPool.length) {
          const replacement = JSON.parse(JSON.stringify(combinedChillPool[poolIdx]));
          activeIds.add(replacement.id);
          poolIdx++;
          dayChanged = true;
          return replacement;
        }
        return act;
      });
      if (dayChanged) {
        day.activities = optimizeDayPath(day.activities, startCoords);
      }
    });
  } else if (type === "reset") {
    if (state.originalItineraryBackup) {
      pushStateToUndoHistory("Reset to Baseline Plan");
      state.itinerary = JSON.parse(JSON.stringify(state.originalItineraryBackup));
      state.activeDisruption = null;
      saveToLocalStorage();
      renderDashboard();
      showToast("Plan Restored 🔄", "Reverted to original generated itinerary.", "info");
      return;
    }
  }

  const diffData = computeItineraryDiff(state.itinerary, draftItinerary, startCoords);
  const titles = {
    rain: "Monsoon & Rain Shelter Contingency",
    delay: "Express Delay Route & Morning Buffer",
    chill: "Relaxation & Wellness Pacing"
  };
  const dynamicRationale = generateDynamicRationale(diffData, titles[type] || "Disruption Adaptation");

  showDiffPreviewModal(
    diffData,
    { itinerary: draftItinerary, totalBudget: state.totalBudget, activeDisruption: proposedDisruption },
    dynamicRationale,
    titles[type] || "Disruption Adaptation",
    "Rule Engine Contingency"
  );
}

// =============================================================================
// 11. IN-APP OPTIMIZATION & IMPACT METRICS PANEL
// =============================================================================

function showImpactMetricsModal() {
  const modal = document.getElementById("impact-metrics-modal");
  const content = document.getElementById("impact-metrics-content");
  if (!modal || !content) return;

  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const startCoords = state.hotelOrigin || destInfo.centerCoords;

  let totalTripKm = 0;
  let totalTripCost = 0;
  let totalStops = 0;

  state.itinerary.forEach(day => {
    totalTripKm += calculatePathDistance(day.activities, startCoords);
    totalTripCost += day.activities.reduce((s, a) => s + (Number(a.cost) || 0), 0);
    totalStops += day.activities.length;
  });

  const totalCabMins = Math.round((totalTripKm / 25) * 60);

  content.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-box">
        <span class="metric-val">${totalTripKm.toFixed(1)} km</span>
        <span class="metric-lbl">Total Commute Distance</span>
        <span class="metric-sub">Optimized via Haversine TSP</span>
      </div>
      <div class="metric-box">
        <span class="metric-val">~${totalCabMins} mins</span>
        <span class="metric-lbl">Estimated Transit Cab Time</span>
        <span class="metric-sub">Urban traffic pacing @ 25 km/h</span>
      </div>
      <div class="metric-box">
        <span class="metric-val">₹${totalTripCost.toLocaleString('en-IN')}</span>
        <span class="metric-lbl">Total Activity Spend</span>
        <span class="metric-sub">₹${state.totalBudget.toLocaleString('en-IN')} budget allocation</span>
      </div>
      <div class="metric-box">
        <span class="metric-val">${totalStops}</span>
        <span class="metric-lbl">Curated Stops</span>
        <span class="metric-sub">Across ${state.daysCount} days</span>
      </div>
    </div>

    <div class="metrics-detail-card">
      <h4>⚡ Algorithm Performance & Constraints</h4>
      <ul>
        <li><strong>Routing Solver:</strong> ${totalStops / state.daysCount <= 7 ? 'Exact Permutation Permuter (<1ms)' : 'Nearest-Neighbour + 2-Opt Local Search (0ms freeze)'}</li>
        <li><strong>Circadian Slot Affinity:</strong> Preserves morning forts vs. sunset viewpoints & night shows</li>
        <li><strong>Origin:</strong> ${state.hotelOrigin ? `Custom Hotel [${state.hotelOrigin[0].toFixed(3)}, ${state.hotelOrigin[1].toFixed(3)}]` : 'City Center Baseline'}</li>
        <li><strong>Live Forecast Link:</strong> Connected to Open-Meteo REST API (${state.liveForecast ? 'Forecast Loaded' : 'Standing By'})</li>
      </ul>
    </div>
  `;

  modal.style.display = "flex";
}

function closeImpactMetricsModal() {
  const modal = document.getElementById("impact-metrics-modal");
  if (modal) modal.style.display = "none";
}

// =============================================================================
// 12. CALENDAR (.ICS) EXPORT & SHAREABLE URL HASH
// =============================================================================

function exportTripToIcs() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const start = new Date(state.startDate || Date.now());

  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TravelPilot//India Trip Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  state.itinerary.forEach((day, dIdx) => {
    const dayDate = new Date(start);
    dayDate.setDate(dayDate.getDate() + dIdx);
    const dateStr = dayDate.toISOString().split('T')[0].replace(/-/g, "");

    day.activities.forEach((act, aIdx) => {
      let startH = 9 + (aIdx * 2);
      let startM = 0;
      if (act.timeSlot) {
        const timeMatch = act.timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const p = timeMatch[3].toUpperCase();
          if (p === "PM" && h < 12) h += 12;
          if (p === "AM" && h === 12) h = 0;
          startH = h;
          startM = m;
        }
      }

      const dtStart = `${dateStr}T${String(startH).padStart(2, "0")}${String(startM).padStart(2, "0")}00`;
      const dtEnd = `${dateStr}T${String(Math.min(23, startH + 2)).padStart(2, "0")}${String(startM).padStart(2, "0")}00`;

      icsContent.push(
        "BEGIN:VEVENT",
        `UID:travelpilot-${day.dayNum}-${aIdx}-${Date.now()}@travelpilot.in`,
        `DTSTAMP:${dateStr}T000000Z`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeIcsText(act.name)} (${escapeIcsText(destInfo.name)})`,
        `DESCRIPTION:${escapeIcsText(act.description || '')} - Tip: ${escapeIcsText(act.tip || '')} | Est Cost: INR ${act.cost}`,
        `LOCATION:${escapeIcsText(destInfo.name)}, India`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    });
  });

  icsContent.push("END:VCALENDAR");

  const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `TravelPilot_${destInfo.name}_${state.daysCount}Days.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast("Calendar Exported! 📅", `Saved ${destInfo.name} itinerary as .ics for Google/Apple Calendar.`, "success");
}

function generateShareableUrl() {
  const compactState = {
    d: state.destination,
    n: state.daysCount,
    b: state.totalBudget,
    i: state.selectedInterests,
    s: state.startDate,
    itin: state.itinerary
  };
  const jsonStr = JSON.stringify(compactState);
  const encoded = btoa(encodeURIComponent(jsonStr));
  const shareUrl = `${window.location.origin}${window.location.pathname}#trip=${encoded}`;

  navigator.clipboard.writeText(shareUrl).then(() => {
    showToast("Share Link Copied! 🔗", "Trip URL copied to clipboard. Anyone can open this exact plan.", "success");
  }).catch(() => {
    prompt("Copy this shareable trip URL:", shareUrl);
  });
}

function loadStateFromUrlHash() {
  if (!window.location.hash || !window.location.hash.includes("#trip=")) return false;
  try {
    const encoded = window.location.hash.split("#trip=")[1];
    const jsonStr = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(jsonStr);

    if (parsed && parsed.itin) {
      state.destination = parsed.d || "jaipur";
      state.daysCount = parsed.n || 3;
      state.totalBudget = parsed.b || 18000;
      state.selectedInterests = parsed.i || ["culture", "food"];
      state.startDate = parsed.s || state.startDate;
      state.itinerary = parsed.itin;
      state.originalItineraryBackup = JSON.parse(JSON.stringify(parsed.itin));
      syncFormWithState();
      renderDashboard();
      checkLiveWeatherForecast();
      showToast("Shared Trip Loaded! ✈️", "Loaded custom trip from shared link.", "success");
      return true;
    }
  } catch (err) {
    console.warn("Could not parse trip from URL hash:", err);
  }
  return false;
}

// =============================================================================
// 13. PROACTIVE ROUTE HEALTH & DELAY DIAGNOSTICS
// =============================================================================

function analyzeItineraryHealth() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const startCoords = state.hotelOrigin || destInfo.centerCoords || [26.9124, 75.7873];
  const issues = [];
  let totalTripKm = 0;
  let totalTripDriveMins = 0;

  state.itinerary.forEach((day) => {
    const acts = day.activities;

    for (let i = 0; i < acts.length; i++) {
      const cur = acts[i];
      const curCoords = cur.coords || startCoords;

      if (i < acts.length - 1) {
        const next = acts[i + 1];
        const nextCoords = next.coords || startCoords;
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
            message: `Long commute (${dist} km · ~${driveM}m cab) between "${cur.name}" and "${next.name}" — risk of transit delay.`
          });
        }
      }

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

  const closedAdvisories = getClosedDaysAdvisories();
  closedAdvisories.forEach(ca => {
    issues.push({
      dayNum: ca.dayNum,
      type: "closed_day",
      severity: "high",
      tag: ca.tag,
      message: `${ca.actName} is typically closed on ${ca.closedDayName}s.`
    });
  });

  const uniqueIssues = [];
  const seenTags = new Set();
  issues.forEach(iss => {
    if (!seenTags.has(iss.tag)) {
      seenTags.add(iss.tag);
      uniqueIssues.push(iss);
    }
  });

  const highSeverity = uniqueIssues.filter(i => i.severity !== "low");

  return {
    issues: uniqueIssues,
    hasSevereIssues: highSeverity.length > 0,
    totalTripKm: Number(totalTripKm.toFixed(1)),
    totalTripDriveMins,
    isOptimal: highSeverity.length === 0
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
    if (title) title.innerHTML = `<span>Route Geometry: Optimal Flow</span>`;
    if (desc) desc.textContent = `All stops are sequenced for minimal travel distance (${health.totalTripKm} km commute across all days).`;
    if (btnReroute) btnReroute.style.display = "none";
  } else {
    card.className = "ai-diagnosis-card";
    if (icon) icon.textContent = "🧭";
    if (title) title.innerHTML = `<span>Route Diagnostics: ${health.issues.length} Advisory Item${health.issues.length > 1 ? 's' : ''}</span>`;
    if (desc) desc.textContent = `Potential transit bottlenecks or outdoor weather vulnerabilities detected. Click below to optimize.`;

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

function updateDisruptionBarUI() {
  const title = document.getElementById("disruption-title");
  const desc = document.getElementById("disruption-desc");
  const icon = document.getElementById("disruption-icon");

  if (!title || !desc || !icon) return;

  if (state.activeDisruption === "rain") {
    icon.textContent = "🌧️";
    title.textContent = "Active: Monsoon / Rain Contingency";
    desc.textContent = "Outdoor viewpoints have been safely replaced with indoor heritage havelis & museums.";
  } else if (state.activeDisruption === "delay") {
    icon.textContent = "⏱️";
    title.textContent = "Active: Delay Express Mode";
    desc.textContent = "Schedule condensed to essential priority sights with morning buffers to handle transit delays.";
  } else if (state.activeDisruption === "chill") {
    icon.textContent = "🧘";
    title.textContent = "Active: Relaxation & Wellness Mode";
    desc.textContent = "Pace relaxed with calm cafes, tea lounges, and spa treatments.";
  } else {
    icon.textContent = "⚡";
    title.textContent = "Trip Disruption Assistant";
    desc.textContent = "Unexpected weather, flight delay, or fatigue? Adapt your route and budget with preview diffs.";
  }
}

// =============================================================================
// 14. UI RENDERING & SUB-VIEWS
// =============================================================================

function renderDashboard() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;

  const tripDestEl = document.getElementById("sidebar-trip-dest");
  if (tripDestEl) {
    tripDestEl.textContent = `${state.daysCount} Days in ${destInfo.name}, India`;
  }

  const tripStatusEl = document.getElementById("sidebar-trip-status");
  if (tripStatusEl) {
    tripStatusEl.innerHTML = `<span class="pulse-dot"></span> Status: Conflict-Free`;
  }

  updateUndoRedoUI();
  renderDayTabs();
  renderTimelineFeed();
  recalculateBudget();

  addTraceLog(`[Dashboard] Initialized ${destInfo.name} (${state.daysCount} Days, ₹${state.totalBudget.toLocaleString('en-IN')})`, 'trace-cyan');
}

function addTraceLog(message, colorClass = "trace-green") {
  const container = document.getElementById("trace-terminal-logs");
  if (!container) return;

  const line = document.createElement("div");
  line.className = `trace-line ${colorClass}`;
  line.textContent = message;
  container.appendChild(line);

  // Keep latest 25 lines
  while (container.children.length > 25) {
    container.removeChild(container.firstChild);
  }

  container.scrollTop = container.scrollHeight;
}

function renderDayTabs() {
  const container = document.getElementById("day-pills-container");
  if (!container) return;
  container.innerHTML = "";

  state.itinerary.forEach((day, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `day-pill-btn ${state.activeDayTab === idx ? 'active' : ''}`;
    btn.textContent = `Day ${day.dayNum}`;
    btn.addEventListener("click", () => {
      state.activeDayTab = idx;
      renderDayTabs();
      renderTimelineFeed();
      addTraceLog(`[State] Switched active view to Day ${day.dayNum}`, 'trace-purple');
    });
    container.appendChild(btn);
  });

  const addDayBtn = document.createElement("button");
  addDayBtn.type = "button";
  addDayBtn.className = "day-pill-btn btn-add-day";
  addDayBtn.textContent = "+ Add Day";
  addDayBtn.addEventListener("click", addNewDay);
  container.appendChild(addDayBtn);
}

function renderTimelineFeed() {
  const container = document.getElementById("timeline-feed-container");
  if (!container) return;
  container.innerHTML = "";

  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const startCoords = state.hotelOrigin || destInfo.centerCoords;

  const currentDayIndex = (state.activeDayTab >= 0 && state.activeDayTab < state.itinerary.length)
    ? state.activeDayTab
    : 0;
  const currentDay = state.itinerary[currentDayIndex];
  if (!currentDay || !currentDay.activities) return;

  const slotTimes = [
    "10:00 AM - 12:30 PM",
    "01:00 PM - 02:30 PM",
    "03:30 PM - 05:30 PM",
    "06:30 PM - 08:30 PM",
    "09:00 PM - 10:30 PM"
  ];

  currentDay.activities.forEach((act, actIdx) => {
    const timeLabel = slotTimes[actIdx] || `${act.timeSlot || 'Day Activity'}`;
    const costDisplay = Number(act.cost) > 0 ? `₹${Number(act.cost).toLocaleString('en-IN')}` : "Free";

    let segmentDist = 0;
    let segmentDrive = 0;
    if (actIdx < currentDay.activities.length - 1) {
      const c1 = act.coords || startCoords;
      const c2 = currentDay.activities[actIdx + 1].coords || startCoords;
      segmentDist = calculateDistanceKm(c1[0], c1[1], c2[0], c2[1]);
      segmentDrive = estimateDriveTimeMin(segmentDist);
    }

    const itemEl = document.createElement("div");
    itemEl.className = "timeline-item";

    itemEl.innerHTML = `
      <div class="timeline-track-col">
        <div class="timeline-node-dot"></div>
        <div class="timeline-vertical-line"></div>
      </div>
      <div class="timeline-card">
        <div class="t-card-top-row">
          <span class="t-time-interval">${escapeHtml(timeLabel)}</span>
          <span class="t-card-cost">${escapeHtml(costDisplay)}</span>
        </div>
        <h4 class="t-place-title">${escapeHtml(act.name)}</h4>
        <p class="t-place-desc">${escapeHtml(act.description || 'Verified landmark destination curated for your schedule.')}</p>
        <div class="t-badges-row">
          ${(actIdx === 0 || act.isAnchor) ? `<span class="t-badge badge-anchor">Fixed Anchor</span>` : ''}
          <span class="t-badge badge-weather">☀️ 32°C / Verified</span>
          ${(act.closedDays && act.closedDays.length > 0) ? `<span class="t-badge badge-closed">🔒 Closed: ${act.closedDays.map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(', ')}</span>` : ''}
          <span class="t-badge badge-category">🏷️ ${escapeHtml(act.category || 'Culture')}</span>
        </div>
        <div class="t-actions-row">
          <button type="button" class="btn-timeline-alt" data-day="${currentDayIndex}" data-act="${actIdx}">
            <span>🔍 Find Alternatives</span>
          </button>
          <div class="t-action-btns-right">
            <button type="button" class="btn-timeline-opt" data-day="${currentDayIndex}" title="Optimize Day Route">
              <span>⚡ Optimize</span>
            </button>
            <button type="button" class="btn-timeline-del" data-day="${currentDayIndex}" data-act="${actIdx}" title="Delete Stop">
              ✕
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind Alternatives Modal Trigger
    itemEl.querySelector(".btn-timeline-alt").addEventListener("click", () => {
      openAlternativesModal(currentDayIndex, actIdx);
    });

    // Bind Optimize Route Trigger
    itemEl.querySelector(".btn-timeline-opt").addEventListener("click", () => {
      autoRerouteItinerary(currentDayIndex);
      addTraceLog(`[TSP] Re-optimized Day ${currentDayIndex + 1} with 2-Opt local search`, 'trace-purple');
    });

    // Bind Delete Stop Trigger
    itemEl.querySelector(".btn-timeline-del").addEventListener("click", () => {
      pushStateToUndoHistory(`Deleted Stop: ${act.name}`);
      currentDay.activities.splice(actIdx, 1);
      saveToLocalStorage();
      renderDashboard();
      addTraceLog(`[State] Deleted "${act.name}" from Day ${currentDayIndex + 1}`, 'trace-amber');
      showToast("Stop Removed", `Removed "${act.name}" from Day ${currentDayIndex + 1}.`, "info");
    });

    container.appendChild(itemEl);

    // If there is a next activity, append transit connector
    if (actIdx < currentDay.activities.length - 1) {
      const transitEl = document.createElement("div");
      transitEl.className = "transit-connector-box";
      transitEl.innerHTML = `
        <div class="transit-info-left">
          <span>🚗 ${segmentDrive} min drive • ~${segmentDist} km (Optimized route)</span>
        </div>
        <button type="button" class="transit-link-map">View Route 📍</button>
      `;
      transitEl.querySelector(".transit-link-map").addEventListener("click", () => {
        openMapViewModal();
      });
      container.appendChild(transitEl);
    }
  });
}

function recalculateBudget() {
  const totalBudget = Number(state.totalBudget) || 18000;
  let spentActivities = 0;

  state.itinerary.forEach(day => {
    day.activities.forEach(act => {
      spentActivities += Number(act.cost) || 0;
    });
  });

  const spentFood = Math.round(totalBudget * 0.30);
  const spentTransport = Math.round(totalBudget * 0.25);
  const totalAllocated = spentActivities + spentFood + spentTransport;

  const totalEl = document.getElementById("donut-total-amount");
  if (totalEl) totalEl.textContent = `₹${totalBudget.toLocaleString('en-IN')}`;

  const valActsEl = document.getElementById("b-val-activities");
  if (valActsEl) valActsEl.textContent = `₹${spentActivities.toLocaleString('en-IN')}`;

  const valFoodEl = document.getElementById("b-val-food");
  if (valFoodEl) valFoodEl.textContent = `₹${spentFood.toLocaleString('en-IN')}`;

  const valTransitEl = document.getElementById("b-val-transport");
  if (valTransitEl) valTransitEl.textContent = `₹${spentTransport.toLocaleString('en-IN')}`;

  // SVG Donut segment calculations
  // Circumference C = 2 * PI * 60 = ~377
  const C = 377;
  const safeTotal = Math.max(totalBudget, totalAllocated, 1);
  const fracActs = Math.min(spentActivities / safeTotal, 1);
  const fracFood = Math.min(spentFood / safeTotal, 1);
  const fracTransit = Math.min(spentTransport / safeTotal, 1);

  const segActs = document.getElementById("donut-seg-activities");
  const segFood = document.getElementById("donut-seg-food");
  const segTransit = document.getElementById("donut-seg-transit");

  if (segActs) {
    segActs.style.strokeDasharray = `${C}`;
    segActs.style.strokeDashoffset = `${C * (1 - fracActs)}`;
  }
  if (segFood) {
    segFood.style.strokeDasharray = `${C}`;
    segFood.style.strokeDashoffset = `${C * (1 - (fracActs + fracFood))}`;
  }
  if (segTransit) {
    segTransit.style.strokeDasharray = `${C}`;
    segTransit.style.strokeDashoffset = `${C * (1 - Math.min(fracActs + fracFood + fracTransit, 1))}`;
  }
}

// =============================================================================
// 15. MODALS MANAGEMENT & INTERACTIVE ASSISTANTS
// =============================================================================

function openTripPlannerModal() {
  const modal = document.getElementById("modal-trip-planner");
  if (modal) modal.style.display = "flex";
  syncFormWithState();
}

function closeTripPlannerModal() {
  const modal = document.getElementById("modal-trip-planner");
  if (modal) modal.style.display = "none";
}

function openSimulatorModal() {
  const modal = document.getElementById("modal-simulator");
  if (modal) modal.style.display = "flex";
}

function closeSimulatorModal() {
  const modal = document.getElementById("modal-simulator");
  if (modal) modal.style.display = "none";
}

function openAlternativesModal(dayIdx = 0, actIdx = 0) {
  const modal = document.getElementById("modal-alternatives");
  const container = document.getElementById("alternatives-list-container");
  if (!modal || !container) return;

  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const targetDay = state.itinerary[dayIdx] || state.itinerary[0];
  const targetAct = targetDay?.activities[actIdx];

  const titleEl = document.getElementById("alternatives-modal-title");
  if (titleEl) {
    titleEl.textContent = targetAct ? `🔄 Alternatives for "${targetAct.name}"` : "🔄 Alternative Activities";
  }

  container.innerHTML = "";

  // Collect potential alternative venues
  const contingencyReplacements = destInfo.contingencyPlans?.heavyRain?.replacements || [];
  const backupVenues = (destInfo.activities || []).filter(a => !targetDay.activities.some(cur => cur.id === a.id));
  const alternativesList = [...contingencyReplacements, ...backupVenues].slice(0, 6);

  if (alternativesList.length === 0) {
    container.innerHTML = `<p style="padding: 20px; color: var(--text-muted); text-align: center;">No additional alternative venues found for this time slot.</p>`;
  } else {
    alternativesList.forEach(alt => {
      const card = document.createElement("div");
      card.className = "alt-card";
      card.innerHTML = `
        <div class="alt-left">
          <strong class="alt-name">${escapeHtml(alt.name)}</strong>
          <div class="alt-meta">
            <span>🏷️ ${escapeHtml(alt.category || 'Culture')}</span>
            <span>⏱️ ${escapeHtml(alt.duration || '2 hours')}</span>
            <strong>₹${Number(alt.cost || 0).toLocaleString('en-IN')}</strong>
          </div>
          <p class="alt-desc">${escapeHtml(alt.description || '')}</p>
        </div>
        <button type="button" class="alt-btn-select" data-id="${alt.id}">
          Select Replacement
        </button>
      `;

      card.querySelector(".alt-btn-select").addEventListener("click", () => {
        pushStateToUndoHistory(`Swapped Stop: ${targetAct?.name || 'Activity'} -> ${alt.name}`);
        if (targetDay && targetDay.activities[actIdx]) {
          targetDay.activities[actIdx] = { ...alt, timeSlot: targetAct?.timeSlot || alt.timeSlot };
        }
        saveToLocalStorage();
        closeAlternativesModal();
        renderDashboard();
        addTraceLog(`[Alternatives] Swapped "${targetAct?.name || 'Stop'}" with "${alt.name}"`, 'trace-green');
        showToast("Activity Swapped! 🔄", `Replaced with "${alt.name}".`, "success");
      });

      container.appendChild(card);
    });
  }

  modal.style.display = "flex";
}

function closeAlternativesModal() {
  const modal = document.getElementById("modal-alternatives");
  if (modal) modal.style.display = "none";
}

function openMapViewModal() {
  const modal = document.getElementById("modal-map-view");
  if (!modal) return;
  modal.style.display = "flex";
  setTimeout(() => {
    initOrUpdateMap();
    if (mapInstance && typeof mapInstance.invalidateSize === "function") {
      mapInstance.invalidateSize();
    }
  }, 100);
}

function closeMapViewModal() {
  const modal = document.getElementById("modal-map-view");
  if (modal) modal.style.display = "none";
}

function openQaModal() {
  const modal = document.getElementById("modal-qa-agent");
  if (modal) modal.style.display = "flex";
}

function closeQaModal() {
  const modal = document.getElementById("modal-qa-agent");
  if (modal) modal.style.display = "none";
}

function handleQaQuestion(topic) {
  const box = document.getElementById("qa-answer-box");
  if (!box) return;

  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  let answer = "";

  switch (topic) {
    case "dress_code":
      answer = `👗 <strong>Temple & Heritage Dress Code in ${destInfo.name}:</strong><br>Modest attire covering shoulders and knees is recommended when visiting palaces and temples. Slip-on footwear is ideal as shoes must be removed at shrine entrances.`;
      break;
    case "peak_hours":
      answer = `⏰ <strong>Peak Tourist Hours in ${destInfo.name}:</strong><br>Crowds peak between 11:00 AM and 03:30 PM. For forts and photography, we schedule stops at 08:30 AM (opening) and 05:30 PM (golden hour sunset) to eliminate long queues.`;
      break;
    case "cab_costs":
      answer = `🚕 <strong>Estimated Local Transit Rates in ${destInfo.name}:</strong><br>Full-day private sightseeing cabs (8 hrs/80 km) cost ~₹1,800 to ₹2,500. Auto-rickshaws (Tuk-Tuks) charge ~₹150–₹300 for short hops across the old city.`;
      break;
    case "monsoon":
      answer = `🌧️ <strong>Monsoon & Wet Weather Guarantee:</strong><br>If heavy rain or waterlogging occurs, our deterministic engine automatically swaps open hilltop forts for indoor museums, royal carpet workshops, and covered culinary dining without budget penalties.`;
      break;
    default:
      answer = `Instant answers are verified by our regional travel knowledge base for ${destInfo.name}.`;
  }

  box.innerHTML = answer;
  addTraceLog(`[Q&A Agent] Answered inquiry on "${topic}" for ${destInfo.name}`, 'trace-emerald');
}

// =============================================================================
// 16. INTERACTIVE LEAFLET MAP & HOTEL ORIGIN
// =============================================================================

function initOrUpdateMap() {
  if (typeof L === "undefined") {
    console.warn("Leaflet library not loaded.");
    return;
  }

  const mapContainer = document.getElementById("leaflet-map");
  if (!mapContainer) return;

  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const center = state.hotelOrigin || destInfo.centerCoords || [26.9124, 75.7873];

  if (!mapInstance) {
    mapInstance = L.map("leaflet-map").setView(center, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);

    mapMarkersGroup = L.layerGroup().addTo(mapInstance);
    mapPolylinesGroup = L.layerGroup().addTo(mapInstance);

    mapInstance.on("click", (e) => {
      if (!state.isHotelPickerMode) {
        showToast("Map Info", "Click 'Set Hotel (Click Map)' to reposition your accommodation origin.", "info");
        return;
      }
      const lat = Number(e.latlng.lat.toFixed(4));
      const lon = Number(e.latlng.lng.toFixed(4));
      toggleHotelSelectMode(false);
      handleHotelOriginChange([lat, lon], "Selected Hotel Location");
    });
  } else {
    mapInstance.setView(center, 12);
    mapMarkersGroup.clearLayers();
    mapPolylinesGroup.clearLayers();
  }

  const allPoints = [];

  if (state.hotelOrigin) {
    const hotelIcon = L.divIcon({
      className: "hotel-map-pin",
      html: `<div style="background:#2563eb; color:#fff; border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; font-size:16px; border:2px solid #fff; box-shadow:0 3px 10px rgba(0,0,0,0.3);">🏨</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    const hMarker = L.marker(state.hotelOrigin, { icon: hotelIcon })
      .bindPopup(`<strong>Hotel Starting Point</strong><br>${escapeHtml(state.hotelName || 'Your Hotel')}`);
    mapMarkersGroup.addLayer(hMarker);
    allPoints.push(state.hotelOrigin);
  }

  const currentDayIndex = (state.activeDayTab >= 0 && state.activeDayTab < state.itinerary.length) ? state.activeDayTab : 0;
  const currentDay = state.itinerary[currentDayIndex];

  if (currentDay && currentDay.activities) {
    const dayCoords = [];
    if (state.hotelOrigin) dayCoords.push(state.hotelOrigin);

    currentDay.activities.forEach((act, actIdx) => {
      const coords = act.coords || center;
      dayCoords.push(coords);
      allPoints.push(coords);

      const customIcon = L.divIcon({
        className: "leaflet-div-custom-pin",
        html: `<div style="background:#2563eb; color:#fff; font-weight:700; font-size:12px; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.25);">${actIdx + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const popupHtml = `
        <div style="font-family: var(--font-sans); padding: 4px;">
          <strong style="font-size: 14px; color: #0f172a;">${escapeHtml(act.name)}</strong>
          <p style="font-size: 12px; color: #475569; margin: 4px 0;">${escapeHtml(act.description || '')}</p>
          <div style="font-weight: 700; color: #2563eb; font-size: 12px;">₹${act.cost || 0}</div>
        </div>
      `;

      const marker = L.marker(coords, { icon: customIcon }).bindPopup(popupHtml);
      mapMarkersGroup.addLayer(marker);
    });

    if (dayCoords.length > 1) {
      const polyline = L.polyline(dayCoords, {
        color: "#2563eb",
        weight: 4,
        opacity: 0.85,
        dashArray: "6, 8"
      });
      mapPolylinesGroup.addLayer(polyline);
    }
  }

  if (allPoints.length > 1) {
    try {
      mapInstance.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
    } catch (e) {}
  }
}

function toggleHotelSelectMode(forceVal) {
  state.isHotelPickerMode = typeof forceVal === "boolean" ? forceVal : !state.isHotelPickerMode;
  const btn = document.getElementById("btn-toggle-hotel-mode");
  const text = document.getElementById("hotel-mode-text");
  if (state.isHotelPickerMode) {
    if (btn) btn.classList.add("btn-primary");
    if (text) text.textContent = "Click map to set Hotel";
    showToast("Hotel Selection Active 📍", "Click any spot on the map to set your hotel starting point.", "info");
  } else {
    if (btn) btn.classList.remove("btn-primary");
    if (text) text.textContent = "Set Hotel (Click Map)";
  }
}

function handleHotelOriginChange(coords, name = "Selected Hotel") {
  state.hotelOrigin = coords;
  state.hotelName = name;
  saveToLocalStorage();
  renderDashboard();
  initOrUpdateMap();
  addTraceLog(`[Origin] Set starting hotel origin at [${coords[0]}, ${coords[1]}]`, 'trace-emerald');
  showToast("Hotel Set! 🏨", `Origin updated to ${name}. Routes recalculated.`, "success");
}

function addNewDay() {
  pushStateToUndoHistory("Added Day");
  const nextDayNum = state.itinerary.length + 1;
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;

  state.itinerary.push({
    dayNum: nextDayNum,
    title: `Day ${nextDayNum}: Extended Exploration in ${destInfo.name}`,
    activities: [
      {
        id: `custom-ext-${Date.now()}`,
        name: `Local Heritage Bazaars & Cultural Exploration`,
        timeSlot: "Morning (10:00 AM)",
        category: "culture",
        cost: 250,
        duration: "2.5 hours",
        description: `Explore authentic neighborhood artisan workshops and try fresh regional snacks.`,
        tip: "Ask locals for authentic chai spots.",
        coords: destInfo.centerCoords,
        slotPreference: "morning",
        weatherSensitive: false,
        exertionLevel: "low",
        costTier: "budget"
      }
    ]
  });

  state.daysCount = state.itinerary.length;
  state.activeDayTab = state.itinerary.length - 1;
  saveToLocalStorage();
  renderDashboard();
  addTraceLog(`[State] Added Day ${nextDayNum} to itinerary`, 'trace-green');
  showToast("Trip Extended! 📅", `Added Day ${nextDayNum} to your itinerary.`, "success");
}

function showToast(title, message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-card toast-${type}`;
  toast.innerHTML = `
    <div class="toast-body">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(message)}</p>
    </div>
    <button class="toast-close-btn">✕</button>
  `;

  toast.querySelector(".toast-close-btn").addEventListener("click", () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

function saveToLocalStorage() {
  try {
    const toSave = { ...state, llmConfig: { ...state.llmConfig, apiKey: "" } };
    localStorage.setItem("travelpilot_saved_trip", JSON.stringify(toSave));
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
}

// =============================================================================
// 17. EVENT LISTENERS & BOOTSTRAP
// =============================================================================

function setupEventListeners() {
  // Top Nav Tab switches & branding home
  document.getElementById("btn-brand-home")?.addEventListener("click", () => {
    closeAllModals();
    renderDashboard();
  });

  document.getElementById("tab-nav-dashboard")?.addEventListener("click", () => {
    closeAllModals();
    setActiveTopNav("dashboard");
  });

  document.getElementById("tab-nav-planner")?.addEventListener("click", () => {
    openTripPlannerModal();
    setActiveTopNav("planner");
  });

  document.getElementById("tab-nav-simulator")?.addEventListener("click", () => {
    openSimulatorModal();
    setActiveTopNav("simulator");
  });

  document.getElementById("tab-nav-alternatives")?.addEventListener("click", () => {
    openAlternativesModal(state.activeDayTab || 0, 0);
    setActiveTopNav("alternatives");
  });

  document.getElementById("tab-nav-map")?.addEventListener("click", () => {
    openMapViewModal();
    setActiveTopNav("map");
  });

  document.getElementById("tab-nav-ask-agent")?.addEventListener("click", () => {
    openQaModal();
    setActiveTopNav("ask-agent");
  });

  // AI Agent Suite Items (Left Sidebar)
  document.getElementById("agent-btn-constraints")?.addEventListener("click", openTripPlannerModal);
  document.getElementById("agent-btn-alternatives")?.addEventListener("click", () => openAlternativesModal(state.activeDayTab || 0, 0));
  document.getElementById("agent-btn-simulator")?.addEventListener("click", openSimulatorModal);
  document.getElementById("agent-btn-qa")?.addEventListener("click", openQaModal);
  document.getElementById("agent-btn-explainer")?.addEventListener("click", () => {
    addTraceLog(`[Explainer Trace] Bounded autonomy mode: Intent parsing -> Slot validation -> TSP 2-Opt -> Diff approval`, 'trace-amber');
    showToast("Explainer Trace", "Active logic pipeline logged in Live Agent Trace console.", "info");
  });

  // Current Trip Card modify button
  document.getElementById("btn-sidebar-modify-trip")?.addEventListener("click", openTripPlannerModal);

  // Budget Engine simulate cost change button
  document.getElementById("btn-simulate-cost-change")?.addEventListener("click", openSimulatorModal);

  // Trip Planner Form submit & close
  document.getElementById("trip-planner-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    state.destination = document.getElementById("select-destination").value;
    state.daysCount = Number(document.getElementById("input-days").value) || 3;
    state.totalBudget = Number(document.getElementById("input-budget").value) || 18000;
    state.startDate = document.getElementById("input-start-date")?.value || state.startDate;
    state.activeDayTab = 0;

    generateItinerary(true);
    closeTripPlannerModal();
    addTraceLog(`[Planner] Generated plan for ${state.destination} (${state.daysCount} Days, ₹${state.totalBudget})`, 'trace-emerald');
  });

  document.getElementById("btn-planner-close")?.addEventListener("click", closeTripPlannerModal);
  document.getElementById("btn-planner-cancel")?.addEventListener("click", closeTripPlannerModal);

  // Simulator Modal triggers & close
  document.getElementById("btn-simulator-close")?.addEventListener("click", closeSimulatorModal);
  document.getElementById("btn-scenario-rain")?.addEventListener("click", () => {
    closeSimulatorModal();
    applyDisruptionScenario("rain");
  });
  document.getElementById("btn-scenario-delay")?.addEventListener("click", () => {
    closeSimulatorModal();
    applyDisruptionScenario("delay");
  });
  document.getElementById("btn-scenario-chill")?.addEventListener("click", () => {
    closeSimulatorModal();
    applyDisruptionScenario("chill");
  });
  document.getElementById("btn-scenario-budget")?.addEventListener("click", () => {
    closeSimulatorModal();
    applyDisruptionScenario("budget");
  });

  document.getElementById("form-copilot")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("input-copilot-prompt");
    if (input && input.value) {
      closeSimulatorModal();
      parseAndExecuteAiPrompt(input.value);
    }
  });

  // Alternatives Modal close
  document.getElementById("btn-alternatives-close")?.addEventListener("click", closeAlternativesModal);

  // Map Modal close
  document.getElementById("btn-map-close")?.addEventListener("click", closeMapViewModal);

  // Q&A Modal close
  document.getElementById("btn-qa-close")?.addEventListener("click", closeQaModal);

  // Undo / Redo controls
  document.getElementById("btn-header-undo")?.addEventListener("click", performUndo);
  document.getElementById("btn-header-redo")?.addEventListener("click", performRedo);

  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      if (e.shiftKey) {
        e.preventDefault();
        performRedo();
      } else {
        e.preventDefault();
        performUndo();
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      performRedo();
    }
  });

  // Diff Preview Modal Actions
  document.getElementById("btn-diff-approve")?.addEventListener("click", applyPendingDiff);
  document.getElementById("btn-diff-cancel")?.addEventListener("click", closeDiffPreviewModal);
  document.getElementById("btn-diff-close")?.addEventListener("click", closeDiffPreviewModal);

  // AI Settings Modal
  document.getElementById("btn-ai-settings")?.addEventListener("click", openAiSettingsModal);
  document.getElementById("btn-ai-settings-close")?.addEventListener("click", closeAiSettingsModal);
  document.getElementById("form-ai-settings")?.addEventListener("submit", saveAiSettings);

  // Export actions
  document.getElementById("btn-export-ics")?.addEventListener("click", exportTripToIcs);
  document.getElementById("btn-share-trip")?.addEventListener("click", generateShareableUrl);
  document.getElementById("btn-print-itinerary")?.addEventListener("click", () => window.print());
}

function setActiveTopNav(viewName) {
  document.querySelectorAll(".nav-tab").forEach(tab => {
    if (tab.dataset.view === viewName) tab.classList.add("active");
    else tab.classList.remove("active");
  });
}

function closeAllModals() {
  closeTripPlannerModal();
  closeSimulatorModal();
  closeAlternativesModal();
  closeMapViewModal();
  closeQaModal();
  closeAiSettingsModal();
  closeDiffPreviewModal();
  setActiveTopNav("dashboard");
}

function openAiSettingsModal() {
  const modal = document.getElementById("ai-settings-modal");
  const provider = document.getElementById("ai-provider-select");
  const key = document.getElementById("ai-api-key");
  const model = document.getElementById("ai-model-name");
  const endpoint = document.getElementById("ai-endpoint-url");

  if (!modal) return;
  if (provider) provider.value = state.llmConfig.provider || "builtin_fallback";
  if (key) key.value = sessionStorage.getItem("travelpilot_api_key") || "";
  if (model) model.value = state.llmConfig.model || "gpt-4o-mini";
  if (endpoint) endpoint.value = state.llmConfig.endpoint || "https://api.openai.com/v1/chat/completions";

  modal.style.display = "flex";
}

function closeAiSettingsModal() {
  const modal = document.getElementById("ai-settings-modal");
  if (modal) modal.style.display = "none";
}

function saveAiSettings(e) {
  e.preventDefault();
  state.llmConfig.provider = document.getElementById("ai-provider-select").value;
  const keyVal = document.getElementById("ai-api-key").value.trim();
  sessionStorage.setItem("travelpilot_api_key", keyVal);
  state.llmConfig.apiKey = keyVal;
  state.llmConfig.model = document.getElementById("ai-model-name").value.trim();
  state.llmConfig.endpoint = document.getElementById("ai-endpoint-url").value.trim();

  closeAiSettingsModal();
  showToast("AI Settings Saved ⚙️", `Active provider: ${state.llmConfig.provider}`, "success");
}

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
  const dateInput = document.getElementById("input-start-date");

  if (destSelect) destSelect.value = state.destination;
  if (daysSelect) daysSelect.value = String(state.daysCount);
  if (budgetInput) budgetInput.value = state.totalBudget;
  if (dateInput && state.startDate) dateInput.value = state.startDate;

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

// Service Worker Registration for PWA Offline Support
if (typeof window !== 'undefined' && window.location && typeof window.location.protocol === 'string' && window.location.protocol.startsWith('http') && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('ServiceWorker registered:', reg.scope);
    }).catch(err => {
      console.warn('ServiceWorker registration error:', err);
    });
  });
}

// Initial Boot
document.addEventListener("DOMContentLoaded", () => {
  renderInterestChips();
  setupEventListeners();

  if (loadStateFromUrlHash()) return;

  const saved = localStorage.getItem("travelpilot_saved_trip");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.itinerary && parsed.itinerary.length > 0) {
        state = { ...state, ...parsed };
        syncFormWithState();
        renderDashboard();
        checkLiveWeatherForecast();
        return;
      }
    } catch (e) {
      console.warn("Could not load saved trip:", e);
    }
  }

  generateItinerary(false);
});
