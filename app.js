/**
 * TravelPilot - Production Algorithmic Trip Planner & AI Route Optimizer for India
 * 
 * Technical Highlights:
 *  - AI Co-Pilot: Bounded Autonomy LLM Intent API + Tokenized Rule-Based Fallback Engine (No substring bugs)
 *  - Hybrid TSP Optimizer: Exact Permutations (n <= 7) & Nearest-Neighbour + 2-Opt Local Search (n > 7) (Zero Freeze Risk)
 *  - Preview, Approve & Undo: Before/After Diff Modal, Dynamic Rationale from actual diffs, & Full Undo/Redo History Stack
 *  - Proactive Live Weather Trigger: Open-Meteo REST API forecast integration + Closed-Day opening hours validator
 *  - In-App Optimization & Impact Metrics Panel: Commute km saved, transit time shaved, budget efficiency, conflict diagnostics
 *  - Calendar & Sharing: .ics export for Google/Apple Calendar, Shareable URL state encoding (#trip=...)
 *  - Multi-Tier Budget Generator: Budget (< ₹2,500/day), Moderate, and Luxury (> ₹6,000/day) across 6 destinations
 *  - Secure HTML Entity Sanitization (XSS Defense)
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
  hotelOrigin: null, // Custom starting coordinates [lat, lon] or null for city center
  hotelName: null,
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
  activePendingDiff: null // Holds proposed changes awaiting user approval in diff modal
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
// 3. UNDO & REDO HISTORY STACK ENGINE
// =============================================================================

function pushStateToUndoHistory(actionName = "Itinerary Modification") {
  const snapshot = {
    actionName,
    itinerary: JSON.parse(JSON.stringify(state.itinerary)),
    totalBudget: state.totalBudget,
    activeDisruption: state.activeDisruption,
    timestamp: Date.now()
  };
  state.undoStack.push(snapshot);
  if (state.undoStack.length > 20) state.undoStack.shift();
  state.redoStack = []; // Clear redo stack on fresh action
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
    timestamp: Date.now()
  };
  state.redoStack.push(currentSnapshot);

  const prev = state.undoStack.pop();
  state.itinerary = JSON.parse(JSON.stringify(prev.itinerary));
  state.totalBudget = prev.totalBudget;
  state.activeDisruption = prev.activeDisruption;

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
    timestamp: Date.now()
  };
  state.undoStack.push(currentSnapshot);

  const next = state.redoStack.pop();
  state.itinerary = JSON.parse(JSON.stringify(next.itinerary));
  state.totalBudget = next.totalBudget;
  state.activeDisruption = next.activeDisruption;

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

function optimizeDayPath(activities, defaultCenter) {
  if (!activities || activities.length <= 1) return activities;

  const center = state.hotelOrigin || defaultCenter || [26.9124, 75.7873];
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
    // Fallback for n > 7: Nearest-Neighbor + 2-Opt Local Search (Guaranteed 0ms freeze)
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
function autoRerouteItinerary(targetDayIndex = -1, promptForApproval = true) {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const center = state.hotelOrigin || destInfo.centerCoords || [26.9124, 75.7873];
  
  // Clone draft
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
      "TSP Route Geometry Optimization"
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
// 5. BUDGET-AWARE GENERATION & CLOSED-DAYS AWARENESS
// =============================================================================

function generateItinerary(pushHistory = true) {
  if (pushHistory && state.itinerary && state.itinerary.length > 0) {
    pushStateToUndoHistory("Itinerary Generation");
  }

  const destKey = state.destination;
  const destInfo = DESTINATIONS_DATA[destKey] || DESTINATIONS_DATA.jaipur;
  const allPlaces = [...destInfo.places];

  const numDays = state.daysCount || 3;
  const targetDailyBudget = (Number(state.totalBudget) || 18000) / numDays;

  // Score places based on interest relevance and budget tier compatibility
  const scoredPlaces = allPlaces.map(p => {
    let score = 0;

    if (state.selectedInterests.includes(p.category)) {
      score += 6;
    }

    const cost = Number(p.cost) || 0;
    if (targetDailyBudget < 2500) {
      if (cost <= 250 || p.costTier === "budget") score += 5;
      else if (cost > 1000 || p.costTier === "premium") score -= 8;
    } else if (targetDailyBudget > 6000) {
      if (cost >= 800 || p.costTier === "premium") score += 6;
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
    else if (d === 4) dayTheme = `Day 4: Adventure & Offbeat Trails`;
    else if (d === 5) dayTheme = `Day 5: Artisan Bazaars & Wellness`;
    else if (d >= 6) dayTheme = `Day ${d}: Extended Discovery & Leisure`;

    const startCoords = state.hotelOrigin || destInfo.centerCoords;
    const optimizedActs = optimizeDayPath(dayActivities, startCoords);

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
  checkLiveWeatherForecast();
  showToast("Itinerary Generated! 🚀", `Crafted budget-optimized ${numDays}-day plan for ${destInfo.name}.`, "success");
}

// =============================================================================
// 6. AI CO-PILOT (BOUNDED LLM INTENT LAYER + TOKENIZED FALLBACK PARSER)
// =============================================================================

// Robust tokenized rule fallback with word boundaries and negation handling
function parseIntentWithRuleFallback(promptText) {
  if (!promptText || !promptText.trim()) return null;
  const text = promptText.toLowerCase();

  const intents = [];
  let confidence = 0.92;
  const constraints = {};

  // Check negations
  const hasNotRain = /\b(not|no|don'?t)\b.*?\b(rain|raining|wet|indoor)\b/.test(text);
  const hasNotDelay = /\b(not|no|without|zero)\b.*?\b(delay|delayed|late|rush)\b/.test(text);

  // Intent 1: Weather (Rain / Monsoon / Storm / Waterlog / Wet)
  // Uses strict word boundaries so "train" or "drain" never triggers rain!
  const isRain = !hasNotRain && (
    /\b(rain|raining|rains|monsoon|storm|stormy|pouring|drenched|waterlog\w*|downpour|heavy shower|wet)\b/.test(text)
  );
  if (isRain) intents.push("weather_rain");

  // Intent 2: Delay / Traffic / Transit / Train Delay / Flight Delay
  const isDelay = !hasNotDelay && (
    /\b(delay|delayed|traffic|jam|stuck|late|flight delay|train delay|train|slow transit|shorten)\b/.test(text)
  );
  if (isDelay) intents.push("traffic_delay");

  // Intent 3: Fatigue / Wellness / Chill / Slow Pace
  const isChill = /\b(tired|exhausted|exhaust|chill|relax|relaxing|spa|massage|rest|wellness|slow down|leisure|gentle)\b/.test(text);
  if (isChill) intents.push("fatigue_chill");

  // Intent 4: Budget Low
  const isTightBudget = /\b(tight budget|cheap|free|low budget|save money|street food|broke|economical|budget cut|cheaper)\b/.test(text);
  if (isTightBudget) {
    intents.push("budget_low");
    constraints.budgetScale = 0.6;
  }

  // Intent 5: Luxury Upgrade
  const isLuxury = /\b(luxury|royal|high tea|cruise|expensive|premium|splurge|5 star|five star|vip)\b/.test(text);
  if (isLuxury) {
    intents.push("budget_luxury");
    constraints.budgetScale = 1.5;
  }

  // Intent 6: Reset
  const isReset = /\b(reset|original|start over|restart|undo all|baseline)\b/.test(text);
  if (isReset) intents.push("reset_plan");

  // Default intent: route optimization if no disruption intent matched
  if (intents.length === 0) {
    intents.push("reroute_optimize");
    confidence = 0.85;
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
    userSummary = "Detected economical budget request. Proposing low-cost heritage stepwells, walking tours, and street dining.";
  } else if (intents.includes("budget_luxury")) {
    userSummary = "Detected luxury upgrade request. Proposing royal high tea, private boat cruises, and signature heritage dining.";
  } else if (intents.includes("reset_plan")) {
    userSummary = "Detected request to restore baseline generated itinerary.";
  } else {
    userSummary = "Evaluating route geometry to minimize travel commute distance.";
  }

  return {
    intents,
    confidence,
    targetDays: [1, 2, 3],
    constraints,
    userSummary,
    source: "tokenized_rule_fallback"
  };
}

// Real LLM API caller with structured JSON output and bounded autonomy
async function callLlmIntentApi(promptText) {
  if (!state.llmConfig.apiKey || state.llmConfig.provider === "builtin_fallback") {
    return parseIntentWithRuleFallback(promptText);
  }

  const systemPrompt = `You are the AI Co-Pilot intent parser for TravelPilot (India trip planner).
Convert the user's plain-English prompt into structured JSON ONLY.
Output JSON schema:
{
  "intents": ["weather_rain" | "traffic_delay" | "fatigue_chill" | "budget_low" | "budget_luxury" | "reroute_optimize" | "reset_plan"],
  "confidence": number (0.0 to 1.0),
  "targetDays": number[],
  "constraints": {
    "delayHours"?: number,
    "budgetScale"?: number,
    "excludeOutdoor"?: boolean
  },
  "userSummary": string
}
Do NOT include markdown backticks or explanations. Output pure JSON only.`;

  try {
    const response = await fetch(state.llmConfig.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.llmConfig.apiKey}`
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

    // Validate enum guardrails
    const validIntents = ["weather_rain", "traffic_delay", "fatigue_chill", "budget_low", "budget_luxury", "reroute_optimize", "reset_plan"];
    const filteredIntents = (parsed.intents || []).filter(i => validIntents.includes(i));

    return {
      intents: filteredIntents.length > 0 ? filteredIntents : ["reroute_optimize"],
      confidence: parsed.confidence || 0.95,
      targetDays: parsed.targetDays || [1, 2, 3],
      constraints: parsed.constraints || {},
      userSummary: parsed.userSummary || "Parsed user intent via LLM.",
      source: "llm_agent"
    };
  } catch (err) {
    console.warn("LLM API call failed, falling back to rule engine:", err);
    showToast("AI Fallback Active", "Used built-in intent engine (API unreachable).", "info");
    return parseIntentWithRuleFallback(promptText);
  }
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

  if (!parsedPlan) return;

  // Execute deterministic actions on a draft clone
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
    // Rain handling
    if (intents.includes("weather_rain")) {
      proposedDisruption = "rain";
      const plans = destInfo.contingencyPlans;
      if (plans && plans.heavyRain) {
        const rainPool = [...plans.heavyRain.replacements];
        const indoorCore = (destInfo.places || []).filter(p => !p.weatherSensitive);
        const combinedPool = [...rainPool, ...indoorCore];
        let poolIdx = 0;

        draftItinerary.forEach((day) => {
          let changed = false;
          day.activities = day.activities.map(act => {
            if (act.weatherSensitive && poolIdx < combinedPool.length) {
              const rep = JSON.parse(JSON.stringify(combinedPool[poolIdx % combinedPool.length]));
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

    // Delay handling
    if (intents.includes("traffic_delay")) {
      proposedDisruption = proposedDisruption || "delay";
      const plans = destInfo.contingencyPlans;
      const keepIds = new Set(plans?.timeDelay?.keepIds || []);

      draftItinerary.forEach((day) => {
        if (day.activities.length > 2) {
          const filtered = day.activities.filter(a => keepIds.has(a.id));
          day.activities = filtered.length >= 2 ? filtered.slice(0, 2) : day.activities.slice(0, 2);
        }
        if (day.activities[0]) day.activities[0].timeSlot = "Morning (10:30 AM)";
        if (day.activities[1]) day.activities[1].timeSlot = "Afternoon (03:30 PM)";
        day.activities = optimizeDayPath(day.activities, startCoords);
      });
    }

    // Fatigue / Chill handling
    if (intents.includes("fatigue_chill")) {
      proposedDisruption = proposedDisruption || "chill";
      const plans = destInfo.contingencyPlans;
      if (plans && plans.lowEnergy) {
        const chillPool = [...plans.lowEnergy.replacements];
        const lowExertion = (destInfo.places || []).filter(p => p.exertionLevel === "low");
        const combinedChill = [...chillPool, ...lowExertion];
        let poolIdx = 0;

        draftItinerary.forEach((day) => {
          let changed = false;
          day.activities = day.activities.map(act => {
            if (act.exertionLevel === "high" && poolIdx < combinedChill.length) {
              const rep = JSON.parse(JSON.stringify(combinedChill[poolIdx % combinedChill.length]));
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

    // Budget adjustments
    if (intents.includes("budget_low")) {
      draftBudget = Math.max(6000, Math.round(state.totalBudget * 0.6));
    } else if (intents.includes("budget_luxury")) {
      draftBudget = Math.max(30000, Math.round(state.totalBudget * 1.5));
    }

    // TSP re-sequence
    if (intents.includes("reroute_optimize") || intents.length > 0) {
      draftItinerary.forEach((day) => {
        if (day.activities.length > 1) {
          day.activities = optimizeDayPath(day.activities, startCoords);
        }
      });
    }
  }

  // Compute precise diff
  const diffData = computeItineraryDiff(state.itinerary, draftItinerary, startCoords);
  const dynamicRationale = generateDynamicRationale(diffData, parsedPlan.userSummary);

  // Open Preview Diff Modal for explicit user approval!
  showDiffPreviewModal(
    diffData,
    { itinerary: draftItinerary, totalBudget: draftBudget, activeDisruption: proposedDisruption },
    dynamicRationale,
    `AI Intent Adaptation: ${intents.join(" + ")}`
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
    const reordered = propDay.activities.filter(a => curIds.includes(a.id));

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
    parts.push(`Budget variance: ${diff.deltaCost > 0 ? '+' : ''}₹${diff.deltaCost.toLocaleString('en-IN')}.`);
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

function showDiffPreviewModal(diffData, proposedState, dynamicRationale, actionTitle) {
  state.activePendingDiff = { diffData, proposedState, actionTitle };

  const modal = document.getElementById("diff-preview-modal");
  const modalTitle = document.getElementById("diff-modal-title");
  const rationaleEl = document.getElementById("diff-modal-rationale");
  const statsContainer = document.getElementById("diff-stats-container");
  const daysContainer = document.getElementById("diff-days-container");

  if (!modal) return;

  if (modalTitle) modalTitle.textContent = `Review Adaptation: ${actionTitle}`;
  if (rationaleEl) rationaleEl.textContent = dynamicRationale;

  // Render Stats Grid
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

  // Render Day By Day Diff Cards
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

  // Push previous state to undo stack
  pushStateToUndoHistory(actionTitle);

  // Apply proposed state
  state.itinerary = JSON.parse(JSON.stringify(proposedState.itinerary));
  state.totalBudget = proposedState.totalBudget;
  state.activeDisruption = proposedState.activeDisruption;

  closeDiffPreviewModal();
  saveToLocalStorage();
  renderDashboard();

  showToast("Plan Updated! ✅", `${actionTitle} applied. Press Cmd+Z to undo anytime.`, "success");
}

// =============================================================================
// 9. PROACTIVE LIVE WEATHER FORECAST & CLOSED DAYS VALIDATOR
// =============================================================================

async function checkLiveWeatherForecast() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const coords = destInfo.centerCoords || [26.9124, 75.7873];

  const forecastBanner = document.getElementById("proactive-weather-banner");
  if (!forecastBanner) return;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords[0]}&longitude=${coords[1]}&daily=precipitation_probability_max,precipitation_sum,temperature_2m_max,weathercode&timezone=auto`;
    const resp = await fetch(url);
    if (!resp.ok) return;
    const data = await resp.json();
    state.liveForecast = data;

    const daily = data.daily || {};
    const probs = daily.precipitation_probability_max || [];
    const sums = daily.precipitation_sum || [];
    const temps = daily.temperature_2m_max || [];
    const dates = daily.time || [];

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
    console.warn("Open-Meteo forecast fetch error:", err);
    if (forecastBanner) forecastBanner.style.display = "none";
  }
}

// Check closed days for attractions (e.g. museums closed on Mondays)
function getClosedDaysAdvisories() {
  const advisories = [];
  const start = new Date(state.startDate || Date.now());

  state.itinerary.forEach((day, dIdx) => {
    const dayDate = new Date(start);
    dayDate.setDate(dayDate.getDate() + dIdx);
    const dayOfWeek = dayDate.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
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
    const rainPool = [...plans.heavyRain.replacements];
    const indoorCorePlaces = allPlaces.filter(p => !p.weatherSensitive);
    const combinedPool = [...rainPool, ...indoorCorePlaces];
    let poolIdx = 0;

    draftItinerary.forEach((day) => {
      let dayChanged = false;
      day.activities = day.activities.map(act => {
        if (act.weatherSensitive && poolIdx < combinedPool.length) {
          const replacement = JSON.parse(JSON.stringify(combinedPool[poolIdx % combinedPool.length]));
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
      if (day.activities[0]) day.activities[0].timeSlot = "Morning (10:30 AM)";
      if (day.activities[1]) day.activities[1].timeSlot = "Afternoon (03:30 PM)";
      day.activities = optimizeDayPath(day.activities, startCoords);
    });
  } else if (type === "chill" && plans.lowEnergy) {
    const chillPool = [...plans.lowEnergy.replacements];
    const lowExertionCore = allPlaces.filter(p => p.exertionLevel === "low");
    const combinedChillPool = [...chillPool, ...lowExertionCore];
    let poolIdx = 0;

    draftItinerary.forEach((day) => {
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
    titles[type] || "Disruption Adaptation"
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
  const health = analyzeItineraryHealth();

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
        <li><strong>XSS Defense:</strong> Active HTML entity sanitizer on all user text & activity notes</li>
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
      const startHour = 9 + (aIdx * 3);
      const startHourStr = String(startHour).padStart(2, "0");
      const endHourStr = String(startHour + 2).padStart(2, "0");

      const dtStart = `${dateStr}T${startHourStr}0000`;
      const dtEnd = `${dateStr}T${endHourStr}0000`;

      icsContent.push(
        "BEGIN:VEVENT",
        `UID:travelpilot-${day.dayNum}-${aIdx}-${Date.now()}@travelpilot.in`,
        `DTSTAMP:${dateStr}T000000Z`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeHtml(act.name)} (${destInfo.name})`,
        `DESCRIPTION:${escapeHtml(act.description || '')} - Tip: ${escapeHtml(act.tip || '')} | Est Cost: INR ${act.cost}`,
        `LOCATION:${escapeHtml(destInfo.name)}, India`,
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

  // Closed days advisories
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
    desc.textContent = "Unexpected weather, flight delay, or fatigue? Adapt your route and budget in 1 click.";
  }
}

// =============================================================================
// 14. UI RENDERING & SUB-VIEWS
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

  updateAiDiagnosticsUI();
  updateDisruptionBarUI();
  updateUndoRedoUI();

  renderDayTabs();
  renderDayContent();
  recalculateBudget();
  renderInsights();
  renderTransitView();

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
  const startCoords = state.hotelOrigin || destInfo.centerCoords;

  const daysToRender = state.activeDayTab === -1
    ? state.itinerary
    : [state.itinerary[state.activeDayTab]].filter(Boolean);

  daysToRender.forEach((day, dayIndexInView) => {
    const actualDayIndex = state.activeDayTab === -1 ? dayIndexInView : state.activeDayTab;
    const dayCard = document.createElement("div");
    dayCard.className = "day-card";
    dayCard.dataset.dayIndex = actualDayIndex;

    const dayDist = calculatePathDistance(day.activities, startCoords);
    const dayDriveMins = Math.round((dayDist / 25) * 60);

    dayCard.innerHTML = `
      <div class="day-card-header">
        <div>
          <h3 class="day-title">${escapeHtml(day.title || `Day ${day.dayNum}`)}</h3>
          <span class="day-route-meta">🛣️ Daily Commute: ~${dayDist} km (approx. ${dayDriveMins} mins cab travel)</span>
        </div>
        <div class="day-card-actions">
          <button class="btn-optimize-day" data-day-index="${actualDayIndex}" title="Auto-reorder stops geographically">
            <span>⚡ Optimize Day ${day.dayNum}</span>
          </button>
          <button class="btn-add-activity" data-day-index="${actualDayIndex}" title="Add new stop">
            <span>+ Add Stop</span>
          </button>
        </div>
      </div>
      <div class="activities-list" id="activities-day-${actualDayIndex}">
        <!-- Activities rendered dynamically -->
      </div>
    `;

    const actsList = dayCard.querySelector(".activities-list");

    day.activities.forEach((act, actIdx) => {
      let segmentDist = 0;
      let segmentDrive = 0;

      if (actIdx < day.activities.length - 1) {
        const c1 = act.coords || startCoords;
        const c2 = day.activities[actIdx + 1].coords || startCoords;
        segmentDist = calculateDistanceKm(c1[0], c1[1], c2[0], c2[1]);
        segmentDrive = estimateDriveTimeMin(segmentDist);
      }

      const actEl = document.createElement("div");
      actEl.className = "activity-item";
      actEl.draggable = true;
      actEl.dataset.dayIndex = actualDayIndex;
      actEl.dataset.actIndex = actIdx;

      actEl.innerHTML = `
        <div class="act-drag-handle" title="Drag to reorder">⋮⋮</div>
        <div class="act-body">
          <div class="act-top-row">
            <span class="act-time-badge">${escapeHtml(act.timeSlot || 'Morning')}</span>
            <span class="act-category-pill category-${escapeHtml(act.category || 'culture')}">${escapeHtml(act.category || 'Culture')}</span>
            <div class="act-cost-badge">
              <span>₹</span>
              <input type="number" class="cost-inline-input" value="${Number(act.cost) || 0}" min="0" step="50" data-day="${actualDayIndex}" data-act="${actIdx}">
            </div>
            <button class="btn-delete-act" data-day="${actualDayIndex}" data-act="${actIdx}" title="Delete stop">✕</button>
          </div>
          <h4 class="act-name">${escapeHtml(act.name)}</h4>
          <p class="act-desc">${escapeHtml(act.description || '')}</p>
          ${act.tip ? `<div class="act-tip">💡 <strong>Tip:</strong> ${escapeHtml(act.tip)}</div>` : ''}
          ${segmentDist > 0 ? `
            <div class="act-transit-connector">
              <span>🚗 ~${segmentDist} km to next stop (approx. ${segmentDrive}m)</span>
              <a href="https://www.google.com/maps/dir/?api=1&origin=${act.coords ? act.coords[0] + ',' + act.coords[1] : ''}&destination=${day.activities[actIdx + 1]?.coords ? day.activities[actIdx + 1].coords[0] + ',' + day.activities[actIdx + 1].coords[1] : ''}" target="_blank" rel="noopener noreferrer">Directions ↗</a>
            </div>
          ` : ''}
        </div>
      `;

      // Cost inline edit
      const costInput = actEl.querySelector(".cost-inline-input");
      costInput.addEventListener("change", (e) => {
        pushStateToUndoHistory("Budget Cost Edit");
        state.itinerary[actualDayIndex].activities[actIdx].cost = Number(e.target.value) || 0;
        saveToLocalStorage();
        recalculateBudget();
      });

      // Delete stop
      const btnDel = actEl.querySelector(".btn-delete-act");
      btnDel.addEventListener("click", () => {
        pushStateToUndoHistory(`Deleted Stop: ${act.name}`);
        state.itinerary[actualDayIndex].activities.splice(actIdx, 1);
        saveToLocalStorage();
        renderDashboard();
        showToast("Stop Removed", `Removed "${act.name}" from Day ${day.dayNum}.`, "info");
      });

      // Drag and drop handlers
      setupDragDropHandlers(actEl, actualDayIndex, actIdx);

      actsList.appendChild(actEl);
    });

    // Day action listeners
    dayCard.querySelector(".btn-optimize-day").addEventListener("click", () => {
      autoRerouteItinerary(actualDayIndex);
    });

    dayCard.querySelector(".btn-add-activity").addEventListener("click", () => {
      openAddActivityModal(actualDayIndex);
    });

    container.appendChild(dayCard);
  });
}

function setupDragDropHandlers(el, dayIdx, actIdx) {
  el.addEventListener("dragstart", (e) => {
    draggedCard = { dayIdx, actIdx };
    el.classList.add("dragging");
    e.dataTransfer.setData("text/plain", `${dayIdx}:${actIdx}`);
  });

  el.addEventListener("dragend", () => {
    el.classList.remove("dragging");
    draggedCard = null;
  });

  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    el.classList.add("drag-over");
  });

  el.addEventListener("dragleave", () => {
    el.classList.remove("drag-over");
  });

  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("drag-over");
    if (!draggedCard) return;

    const fromDay = draggedCard.dayIdx;
    const fromAct = draggedCard.actIdx;
    const toDay = dayIdx;
    const toAct = actIdx;

    if (fromDay === toDay && fromAct === toAct) return;

    pushStateToUndoHistory("Reordered Stops");
    const item = state.itinerary[fromDay].activities.splice(fromAct, 1)[0];
    state.itinerary[toDay].activities.splice(toAct, 0, item);

    saveToLocalStorage();
    renderDashboard();
    showToast("Stop Reordered", `Moved "${item.name}" successfully.`, "success");
  });
}

function recalculateBudget() {
  const totalBudget = Number(state.totalBudget) || 18000;
  let spentTotal = 0;

  state.itinerary.forEach(day => {
    day.activities.forEach(act => {
      spentTotal += Number(act.cost) || 0;
    });
  });

  const remaining = totalBudget - spentTotal;
  const pct = Math.min(100, Math.round((spentTotal / totalBudget) * 100));

  const fillEl = document.getElementById("budget-bar-fill");
  const spentPctEl = document.getElementById("budget-spent-pct");
  const remainingEl = document.getElementById("budget-remaining-text");
  const badgeEl = document.getElementById("budget-status-badge");

  if (fillEl) {
    fillEl.style.width = `${pct}%`;
    fillEl.className = remaining >= 0 ? "budget-bar-fill within" : "budget-bar-fill exceeded";
  }

  if (spentPctEl) spentPctEl.textContent = `${pct}% allocated (₹${spentTotal.toLocaleString('en-IN')})`;
  if (remainingEl) {
    remainingEl.textContent = remaining >= 0 
      ? `₹${remaining.toLocaleString('en-IN')} remaining`
      : `⚠️ Over budget by ₹${Math.abs(remaining).toLocaleString('en-IN')}`;
    remainingEl.style.color = remaining >= 0 ? "var(--emerald)" : "var(--rose)";
  }

  if (badgeEl) {
    badgeEl.textContent = remaining >= 0 ? "Within Budget" : "Budget Exceeded";
    badgeEl.className = remaining >= 0 ? "budget-status-pill within" : "budget-status-pill exceeded";
  }
}

function renderInsights() {
  const container = document.getElementById("budget-insights-list");
  if (!container) return;

  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const totalBudget = Number(state.totalBudget) || 18000;
  const dailyAvg = Math.round(totalBudget / (state.daysCount || 3));

  let totalKm = 0;
  state.itinerary.forEach(day => {
    totalKm += calculatePathDistance(day.activities, destInfo.centerCoords);
  });

  const approxCabSpend = Math.round((totalKm / 10) * 150);

  container.innerHTML = `
    <div class="insight-item">
      <span>💰 Daily Target Allocation:</span>
      <strong>₹${dailyAvg.toLocaleString('en-IN')}/day</strong>
    </div>
    <div class="insight-item">
      <span>🚕 Est. City Commute Fuel/Cab:</span>
      <strong>~₹${approxCabSpend.toLocaleString('en-IN')} total (${totalKm.toFixed(1)} km)</strong>
    </div>
    <div class="insight-item">
      <span>🏛️ Sights & Experiences:</span>
      <strong>${state.itinerary.reduce((s, d) => s + d.activities.length, 0)} stops selected</strong>
    </div>
  `;
}

function renderTransitView() {
  const container = document.getElementById("transit-content-area");
  if (!container) return;

  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const transit = destInfo.transitInfo || {};

  container.innerHTML = `
    <div class="transit-hub-card">
      <div class="transit-hub-header">
        <h3>🚖 Intercity & Local Transportation for ${escapeHtml(destInfo.name)}</h3>
        <span class="brand-badge">${escapeHtml(destInfo.state)}</span>
      </div>

      <div class="transit-booking-shortcuts">
        <h4>Direct Intercity Booking Links</h4>
        <div class="transit-links-grid">
          <a href="${transit.intercityLinks?.flights || '#'}" target="_blank" rel="noopener noreferrer" class="transit-link-card">
            <span>✈️</span>
            <div><strong>Book Flights</strong><small>MakeMyTrip</small></div>
          </a>
          <a href="${transit.intercityLinks?.trains || '#'}" target="_blank" rel="noopener noreferrer" class="transit-link-card">
            <span>🚆</span>
            <div><strong>Book Trains</strong><small>IRCTC Official</small></div>
          </a>
          <a href="${transit.intercityLinks?.cabs || '#'}" target="_blank" rel="noopener noreferrer" class="transit-link-card">
            <span>🚗</span>
            <div><strong>Outstation Cabs</strong><small>Uber / Ola</small></div>
          </a>
          <a href="${transit.intercityLinks?.buses || '#'}" target="_blank" rel="noopener noreferrer" class="transit-link-card">
            <span>🚌</span>
            <div><strong>Book Buses</strong><small>RedBus</small></div>
          </a>
        </div>
      </div>

      <div class="transit-local-options">
        <h4>Recommended Local Commute Rates</h4>
        <div class="local-transit-table">
          ${(transit.localTransport || []).map(opt => `
            <div class="local-transit-row">
              <div class="transit-mode-info">
                <strong>${escapeHtml(opt.type)}</strong>
                <p>${escapeHtml(opt.tip)}</p>
              </div>
              <div class="transit-cost-col">
                <span class="cost-tag">~₹${opt.avgCost}</span>
                <button class="btn btn-secondary btn-sm btn-add-transit-to-plan" data-type="${escapeHtml(opt.type)}" data-cost="${opt.avgCost}">
                  + Add to Day 1
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll(".btn-add-transit-to-plan").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      const cost = Number(btn.dataset.cost) || 500;
      if (state.itinerary[0]) {
        pushStateToUndoHistory(`Added Transit: ${type}`);
        state.itinerary[0].activities.unshift({
          id: `transit-custom-${Date.now()}`,
          name: `Local Commute: ${type}`,
          timeSlot: "Morning (08:30 AM)",
          category: "adventure",
          cost: cost,
          duration: "1 hour",
          description: `Scheduled local transport pickup and city transfer.`,
          tip: "Keep driver contact handy.",
          coords: destInfo.centerCoords,
          slotPreference: "morning",
          weatherSensitive: false,
          exertionLevel: "low",
          costTier: "budget"
        });
        saveToLocalStorage();
        renderDashboard();
        showToast("Transit Added! 🚕", `Added ${type} (₹${cost}) to Day 1 schedule and budget.`, "success");
      }
    });
  });
}

// =============================================================================
// 15. INTERACTIVE LEAFLET MAP VISUALIZER
// =============================================================================

function initOrUpdateMap() {
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
  } else {
    mapInstance.setView(center, 12);
    mapMarkersGroup.clearLayers();
    mapPolylinesGroup.clearLayers();
  }

  const allPoints = [];

  // Hotel origin marker if selected
  if (state.hotelOrigin) {
    const hotelIcon = L.divIcon({
      className: "hotel-map-pin",
      html: `<div style="background:#4f46e5; color:#fff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:16px; border:2px solid #fff; box-shadow:0 3px 10px rgba(0,0,0,0.3);">🏨</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    const hMarker = L.marker(state.hotelOrigin, { icon: hotelIcon })
      .bindPopup(`<strong>Hotel Starting Point</strong><br>${escapeHtml(state.hotelName || 'Your Accommodation')}`);
    mapMarkersGroup.addLayer(hMarker);
    allPoints.push(state.hotelOrigin);
  }

  const daysToMap = state.activeDayTab === -1
    ? state.itinerary
    : [state.itinerary[state.activeDayTab]].filter(Boolean);

  daysToMap.forEach((day, dayIdx) => {
    const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
    const dayCoords = [];

    if (state.hotelOrigin) dayCoords.push(state.hotelOrigin);

    day.activities.forEach((act, actIdx) => {
      const coords = act.coords || center;
      dayCoords.push(coords);
      allPoints.push(coords);

      const labelTag = `D${day.dayNum}-${actIdx + 1}`;
      const markerHtml = `
        <div class="custom-map-pin" style="background-color: ${color};">
          <span>${labelTag}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "leaflet-div-custom-pin",
        html: markerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -32]
      });

      const popupHtml = `
        <div class="map-popup-card">
          <span class="popup-time">${escapeHtml(act.timeSlot)}</span>
          <h4 class="popup-title">${escapeHtml(act.name)}</h4>
          <p class="popup-desc">${escapeHtml(act.description || '')}</p>
          <div class="popup-footer">
            <span>₹${act.cost || 0}</span>
            <a href="https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}" target="_blank" rel="noopener noreferrer">Open GPS ↗</a>
          </div>
        </div>
      `;

      const marker = L.marker(coords, { icon: customIcon }).bindPopup(popupHtml);
      mapMarkersGroup.addLayer(marker);
    });

    if (dayCoords.length > 1) {
      const polyline = L.polyline(dayCoords, {
        color: color,
        weight: 4,
        opacity: 0.85,
        dashArray: "6, 8"
      });
      mapPolylinesGroup.addLayer(polyline);
    }
  });

  if (allPoints.length > 1) {
    try {
      mapInstance.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
    } catch (e) {
      console.warn("Could not fit bounds:", e);
    }
  }
}

// =============================================================================
// 16. MODALS & TRIP SETUP HANDLERS
// =============================================================================

function addNewDay() {
  pushStateToUndoHistory("Added Day");
  const nextDayNum = state.itinerary.length + 1;
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;

  state.itinerary.push({
    dayNum: nextDayNum,
    title: `Day ${nextDayNum}: Extended Leisure & Exploration in ${destInfo.name}`,
    activities: [
      {
        id: `custom-ext-${Date.now()}`,
        name: `Local Street Exploration & Artisan Markets`,
        timeSlot: "Morning (10:00 AM)",
        category: "culture",
        cost: 250,
        duration: "2 hours",
        description: `Explore authentic neighborhood bazaars, try fresh street foods, and discover artisan crafts.`,
        tip: "Ask locals for their favorite chai stall.",
        coords: destInfo.centerCoords,
        slotPreference: "morning",
        weatherSensitive: false,
        exertionLevel: "low",
        costTier: "budget"
      }
    ]
  });

  state.daysCount = state.itinerary.length;
  saveToLocalStorage();
  renderDashboard();
  showToast("Trip Extended! 📅", `Added Day ${nextDayNum} to your itinerary.`, "success");
}

function openAddActivityModal(dayIndex) {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  const name = prompt(`Enter stop name in ${destInfo.name}:`);
  if (!name || !name.trim()) return;

  const costStr = prompt(`Estimated cost in ₹ INR:`, "300");
  const cost = Number(costStr) || 0;

  pushStateToUndoHistory(`Added Stop: ${name}`);

  state.itinerary[dayIndex].activities.push({
    id: `custom-user-${Date.now()}`,
    name: name.trim(),
    timeSlot: "Afternoon (03:00 PM)",
    category: "culture",
    cost: cost,
    duration: "2 hours",
    description: `Custom activity stop added by traveler.`,
    tip: "Enjoy your personalized visit!",
    coords: destInfo.centerCoords,
    slotPreference: "afternoon",
    weatherSensitive: false,
    exertionLevel: "moderate",
    costTier: cost > 800 ? "premium" : "moderate"
  });

  state.itinerary[dayIndex].activities = optimizeDayPath(
    state.itinerary[dayIndex].activities,
    state.hotelOrigin || destInfo.centerCoords
  );

  saveToLocalStorage();
  renderDashboard();
  showToast("Stop Added!", `Added "${name}" to Day ${dayIndex + 1}.`, "success");
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
    localStorage.setItem("travelpilot_saved_trip", JSON.stringify(state));
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
}

// =============================================================================
// 17. EVENT LISTENERS & INITIALIZATION
// =============================================================================

function setupEventListeners() {
  // Form Submit
  const form = document.getElementById("trip-planner-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      state.destination = document.getElementById("select-destination").value;
      state.daysCount = Number(document.getElementById("input-days").value) || 3;
      state.totalBudget = Number(document.getElementById("input-budget").value) || 18000;
      state.startDate = document.getElementById("input-start-date")?.value || state.startDate;

      generateItinerary(true);

      document.getElementById("section-dashboard")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Quick Example Jaipur
  document.getElementById("btn-sample-trip")?.addEventListener("click", () => {
    state.destination = "jaipur";
    state.daysCount = 3;
    state.totalBudget = 18000;
    state.selectedInterests = ["culture", "food", "nature"];
    syncFormWithState();
    generateItinerary(true);
    document.getElementById("section-dashboard")?.scrollIntoView({ behavior: "smooth" });
  });

  // Reset Form
  document.getElementById("btn-reset-form")?.addEventListener("click", () => {
    if (confirm("Start a new trip? This will reset the planner.")) {
      localStorage.removeItem("travelpilot_saved_trip");
      window.location.hash = "";
      window.location.reload();
    }
  });

  // Undo / Redo Header Buttons
  document.getElementById("btn-header-undo")?.addEventListener("click", performUndo);
  document.getElementById("btn-header-redo")?.addEventListener("click", performRedo);

  // Global Keyboard Shortcuts (Cmd+Z / Ctrl+Z = Undo, Cmd+Shift+Z / Ctrl+Y = Redo)
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

  // AI Co-Pilot Form
  const copilotForm = document.getElementById("form-copilot");
  if (copilotForm) {
    copilotForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("input-copilot-prompt");
      if (input && input.value) {
        parseAndExecuteAiPrompt(input.value);
      }
    });
  }

  // AI Co-Pilot Quick Chips
  document.querySelectorAll(".copilot-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const promptText = chip.dataset.prompt;
      const input = document.getElementById("input-copilot-prompt");
      if (input) input.value = promptText;
      parseAndExecuteAiPrompt(promptText);
    });
  });

  // Auto-Reroute Buttons
  document.getElementById("btn-ai-auto-reroute")?.addEventListener("click", () => autoRerouteItinerary(-1));
  document.getElementById("btn-scenario-rain")?.addEventListener("click", () => applyDisruptionScenario("rain"));
  document.getElementById("btn-scenario-delay")?.addEventListener("click", () => applyDisruptionScenario("delay"));
  document.getElementById("btn-scenario-chill")?.addEventListener("click", () => applyDisruptionScenario("chill"));
  document.getElementById("btn-reset-reroute")?.addEventListener("click", () => applyDisruptionScenario("reset"));

  // View Mode Tabs
  document.querySelectorAll(".view-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchViewMode(btn.dataset.mode);
    });
  });

  // Diff Modal Actions
  document.getElementById("btn-diff-approve")?.addEventListener("click", applyPendingDiff);
  document.getElementById("btn-diff-cancel")?.addEventListener("click", closeDiffPreviewModal);
  document.getElementById("btn-diff-close")?.addEventListener("click", closeDiffPreviewModal);

  // Impact Metrics Modal Actions
  document.getElementById("btn-view-metrics")?.addEventListener("click", showImpactMetricsModal);
  document.getElementById("btn-metrics-close")?.addEventListener("click", closeImpactMetricsModal);

  // AI Settings Modal Actions
  document.getElementById("btn-ai-settings")?.addEventListener("click", openAiSettingsModal);
  document.getElementById("btn-ai-settings-close")?.addEventListener("click", closeAiSettingsModal);
  document.getElementById("form-ai-settings")?.addEventListener("submit", saveAiSettings);

  // Calendar & Share
  document.getElementById("btn-export-ics")?.addEventListener("click", exportTripToIcs);
  document.getElementById("btn-share-trip")?.addEventListener("click", generateShareableUrl);
  document.getElementById("btn-copy-itinerary")?.addEventListener("click", copyTextItinerary);
  document.getElementById("btn-print-itinerary")?.addEventListener("click", () => window.print());
}

function openAiSettingsModal() {
  const modal = document.getElementById("ai-settings-modal");
  const provider = document.getElementById("ai-provider-select");
  const key = document.getElementById("ai-api-key");
  const model = document.getElementById("ai-model-name");
  const endpoint = document.getElementById("ai-endpoint-url");

  if (!modal) return;

  if (provider) provider.value = state.llmConfig.provider || "builtin_fallback";
  if (key) key.value = state.llmConfig.apiKey || "";
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
  state.llmConfig.apiKey = document.getElementById("ai-api-key").value.trim();
  state.llmConfig.model = document.getElementById("ai-model-name").value.trim();
  state.llmConfig.endpoint = document.getElementById("ai-endpoint-url").value.trim();

  saveToLocalStorage();
  closeAiSettingsModal();
  showToast("AI Settings Saved ⚙️", `Active provider: ${state.llmConfig.provider}`, "success");
}

function copyTextItinerary() {
  const destInfo = DESTINATIONS_DATA[state.destination] || DESTINATIONS_DATA.jaipur;
  let text = `✈️ ${destInfo.name} — ${state.daysCount} Day TravelPlan\nTotal Budget: ₹${state.totalBudget}\n\n`;

  state.itinerary.forEach(day => {
    text += `📅 ${day.title}\n`;
    day.activities.forEach((act, idx) => {
      text += `  ${idx + 1}. [${act.timeSlot}] ${act.name} (₹${act.cost}) - ${act.description}\n`;
    });
    text += "\n";
  });

  navigator.clipboard.writeText(text).then(() => {
    showToast("Itinerary Copied! 📋", "Complete trip text copied to clipboard.", "success");
  });
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

// Initial Boot
document.addEventListener("DOMContentLoaded", () => {
  renderInterestChips();
  setupEventListeners();

  // Load from URL Hash if shared
  if (loadStateFromUrlHash()) return;

  // Load from localStorage if present
  const saved = localStorage.getItem("travelpilot_saved_trip");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.itinerary && parsed.itinerary.length > 0) {
        state = { ...state, ...parsed };
        syncFormWithState();
        renderDashboard();
        return;
      }
    } catch (e) {
      console.warn("Could not load saved trip:", e);
    }
  }

  generateItinerary(false);
});
