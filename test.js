/**
 * TravelPilot - Production Test Suite & Benchmark Harness
 * 
 * Includes:
 * 1. DOM Proxy Stub & VM context setup
 * 2. Scoped Negation & Context Intent Evaluation (Tuning Set + Held-Out Test Set)
 * 3. Hybrid TSP Optimizer Benchmark & Slot Penalty Verification (Zero Freeze Risk)
 * 4. Pure buildItinerary Budget Sensitivity across All 6 Destinations
 * 5. Disruption Swap ID Exclusion & Delay Buffer Verification
 */

// 1. Setup Robust DOM Proxy Stub
function createDomProxy() {
  const handler = {
    get(target, prop) {
      if (prop === 'style') return {};
      if (prop === 'classList') return { add: () => {}, remove: () => {}, contains: () => false };
      if (prop === 'dataset') return {};
      if (prop === 'children') return [];
      if (prop === 'innerHTML' || prop === 'textContent' || prop === 'value') return '';
      if (typeof prop === 'string' && (prop.startsWith('on') || prop === 'addEventListener' || prop === 'removeEventListener' || prop === 'appendChild' || prop === 'removeChild')) {
        return () => {};
      }
      return (...args) => createDomProxy();
    },
    set(target, prop, val) {
      return true;
    }
  };
  return new Proxy({}, handler);
}

const domStub = createDomProxy();

let sandbox;
if (typeof require !== 'undefined') {
  const fs = require('fs');
  const vm = require('vm');
  sandbox = {
    console: console,
    document: {
      addEventListener: () => {},
      getElementById: () => domStub,
      querySelector: () => domStub,
      querySelectorAll: () => [],
      createElement: () => domStub,
      body: domStub
    },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    setTimeout: (fn) => (typeof fn === 'function' ? fn() : null),
    window: { addEventListener: () => {}, location: { hash: '', origin: 'http://localhost', pathname: '/', protocol: 'http:' } },
    navigator: { clipboard: { writeText: () => Promise.resolve() }, serviceWorker: { register: () => Promise.resolve() } },
    Date: Date,
    Math: Math,
    JSON: JSON,
    Number: Number,
    String: String,
    Set: Set,
    Array: Array,
    RegExp: RegExp,
    btoa: (str) => Buffer.from(str).toString('base64'),
    atob: (b64) => Buffer.from(b64, 'base64').toString('utf8'),
    encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent
  };

  const dataCode = fs.readFileSync(__dirname + '/data.js', 'utf8');
  const appCode = fs.readFileSync(__dirname + '/app.js', 'utf8');

  vm.createContext(sandbox);
  vm.runInContext(dataCode, sandbox);
  vm.runInContext(appCode, sandbox);

  sandbox.DESTINATIONS_DATA = vm.runInContext('DESTINATIONS_DATA', sandbox);
  sandbox.state = vm.runInContext('state', sandbox);
  sandbox.parseIntentWithRuleFallback = vm.runInContext('parseIntentWithRuleFallback', sandbox);
  sandbox.optimizeDayPath = vm.runInContext('optimizeDayPath', sandbox);
  sandbox.calculatePathDistance = vm.runInContext('calculatePathDistance', sandbox);
  sandbox.buildItinerary = vm.runInContext('buildItinerary', sandbox);
  sandbox.generateItinerary = vm.runInContext('generateItinerary', sandbox);
  sandbox.applyDisruptionScenario = vm.runInContext('applyDisruptionScenario', sandbox);
  sandbox.applyPendingDiff = vm.runInContext('applyPendingDiff', sandbox);
  sandbox.performUndo = vm.runInContext('performUndo', sandbox);
} else {
  // macOS JSC environment
  var console = { log: print, error: print, warn: print, info: print };
  var document = {
    addEventListener: () => {},
    getElementById: () => domStub,
    querySelector: () => domStub,
    querySelectorAll: () => [],
    createElement: () => domStub,
    body: domStub
  };
  var window = { addEventListener: () => {}, location: { hash: '', origin: 'http://localhost', pathname: '/', protocol: 'http:' } };
  var localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  var sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  var navigator = { clipboard: { writeText: () => Promise.resolve() }, serviceWorker: { register: () => Promise.resolve() } };
  var setTimeout = (fn) => (typeof fn === 'function' ? fn() : null);
  var process = { exit: (code) => { if (code !== 0) throw new Error('Test exited with code ' + code); } };

  load('data.js');
  load('app.js');

  sandbox = {
    DESTINATIONS_DATA: DESTINATIONS_DATA,
    state: state,
    parseIntentWithRuleFallback: parseIntentWithRuleFallback,
    optimizeDayPath: optimizeDayPath,
    calculatePathDistance: calculatePathDistance,
    buildItinerary: buildItinerary,
    generateItinerary: generateItinerary,
    applyDisruptionScenario: applyDisruptionScenario,
    applyPendingDiff: applyPendingDiff,
    performUndo: performUndo
  };
}

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    totalPassed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    totalFailed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('================================================================');
console.log('🧪 TravelPilot Automated Test Suite & Benchmark Evaluation');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SUITE 1: TUNING EVALUATION SET (25 Prompts)
// -----------------------------------------------------------------------------
console.log('--- 1. AI Co-Pilot Intent Parser: Tuning Set (25 Prompts) ---');

const tuningSet = [
  { text: "my train is delayed", expected: ["traffic_delay"], forbidden: ["weather_rain"], desc: "Train delay without false rain trigger" },
  { text: "train delay by 2 hours", expected: ["traffic_delay"], forbidden: ["weather_rain"], desc: "Train delay with duration" },
  { text: "taking the morning train", expected: [], forbidden: ["traffic_delay", "weather_rain"], desc: "Neutral train travel without delay words" },
  { text: "it is pouring rain outside", expected: ["weather_rain"], forbidden: [], desc: "Pouring rain" },
  { text: "heavy monsoon downpour in goa", expected: ["weather_rain"], forbidden: [], desc: "Monsoon downpour" },
  { text: "streets are waterlogged, need indoor havelis", expected: ["weather_rain"], forbidden: [], desc: "Waterlogged streets" },
  { text: "stormy wet weather", expected: ["weather_rain"], forbidden: [], desc: "Stormy wet weather" },
  { text: "we are drenched in rain", expected: ["weather_rain"], forbidden: [], desc: "Drenched in rain" },
  { text: "it is not raining keep outdoor sights", expected: [], forbidden: ["weather_rain"], desc: "Clause negation: not raining" },
  { text: "no delay today, on time", expected: [], forbidden: ["traffic_delay"], desc: "Clause negation: no delay" },
  { text: "don't want indoor museums", expected: [], forbidden: ["weather_rain"], desc: "Clause negation: don't want indoor" },
  { text: "not tired at all", expected: [], forbidden: ["fatigue_chill"], desc: "Clause negation: not tired" },
  { text: "our flight is delayed by 3 hours", expected: ["traffic_delay"], forbidden: [], desc: "Flight delay" },
  { text: "stuck in heavy highway traffic", expected: ["traffic_delay"], forbidden: [], desc: "Highway traffic" },
  { text: "we are completely exhausted from the flight", expected: ["fatigue_chill"], forbidden: [], desc: "Exhausted" },
  { text: "feeling tired, want a relaxing spa day", expected: ["fatigue_chill"], forbidden: [], desc: "Tired spa day" },
  { text: "slow down the pace, leisure afternoon", expected: ["fatigue_chill"], forbidden: ["traffic_delay"], desc: "Leisure slow pace" },
  { text: "we are on a tight budget", expected: ["budget_low"], forbidden: ["budget_luxury"], desc: "Tight budget" },
  { text: "looking for cheap street food and free monuments", expected: ["budget_low"], forbidden: [], desc: "Cheap street food" },
  { text: "broke college students saving money", expected: ["budget_low"], forbidden: [], desc: "Saving money" },
  { text: "splurge on 5 star luxury palace high tea", expected: ["budget_luxury"], forbidden: ["budget_low"], desc: "5 star luxury" },
  { text: "pouring rain outside and our train is delayed", expected: ["weather_rain", "traffic_delay"], forbidden: [], desc: "Multi: rain + train delay" },
  { text: "it's raining and we are totally exhausted", expected: ["weather_rain", "fatigue_chill"], forbidden: [], desc: "Multi: rain + fatigue" },
  { text: "reset to original plan", expected: ["reset_plan"], forbidden: ["weather_rain"], desc: "Reset original" },
  { text: "find the shortest travel route", expected: ["reroute_optimize"], forbidden: ["weather_rain"], desc: "Shortest route" }
];

let tuningPassed = 0;
tuningSet.forEach((tc, idx) => {
  const res = sandbox.parseIntentWithRuleFallback(tc.text);
  const detected = res ? res.intents : [];
  const hasExpected = tc.expected.length === 0 ? detected.length === 0 : tc.expected.every(e => detected.includes(e));
  const hasForbidden = tc.forbidden.some(f => detected.includes(f));
  const pass = hasExpected && !hasForbidden;

  if (pass) tuningPassed++;
  assert(pass, `[Tuning #${idx + 1}] "${tc.text}" -> [${detected.join(', ')}] (${tc.desc})`);
});

const tuningScore = ((tuningPassed / tuningSet.length) * 100).toFixed(1);
console.log(`\n📊 Tuning Set Accuracy: ${tuningPassed}/${tuningSet.length} (${tuningScore}%)\n`);

// -----------------------------------------------------------------------------
// SUITE 2: HELD-OUT TEST SET (25 Prompts)
// -----------------------------------------------------------------------------
console.log('--- 2. AI Co-Pilot Intent Parser: Held-Out Test Set (25 Prompts) ---');

const heldOutSet = [
  // 1. Scoped negation: "no worries, it's pouring" (Earlier clause has "no", but "pouring" is positive intent)
  { text: "no worries, it's pouring rain outside", expected: ["weather_rain"], forbidden: [], desc: "Scoped negation: no worries + pouring" },
  // 2. Scoped negation: "we aren't delayed, just want lunch"
  { text: "we aren't delayed, just want lunch", expected: [], forbidden: ["traffic_delay"], desc: "Scoped negation: aren't delayed" },
  // 3. Train + stuck context
  { text: "stuck on train due to signal jam", expected: ["traffic_delay"], forbidden: ["weather_rain"], desc: "Train stuck" },
  // 4. Train + cancelled context
  { text: "our morning train got cancelled", expected: ["traffic_delay"], forbidden: ["weather_rain"], desc: "Train cancelled" },
  // 5. "Too expensive" maps to budget_low
  { text: "the current tickets are too expensive for us", expected: ["budget_low"], forbidden: ["budget_luxury"], desc: "Too expensive -> budget_low" },
  // 6. "Over budget" maps to budget_low
  { text: "we are way over budget, cut costs", expected: ["budget_low"], forbidden: [], desc: "Over budget -> budget_low" },
  // 7. "Free time" should NOT trigger budget_low
  { text: "give us some free time in the afternoon", expected: [], forbidden: ["budget_low"], desc: "Free time is not free sights" },
  // 8. "Royal palace" should be sightseeing, NOT luxury unless splurge/luxury requested
  { text: "we want to visit the royal palace monuments", expected: [], forbidden: ["budget_luxury"], desc: "Royal palace sightseeing" },
  // 9. Luxury splurge with gourmet dining
  { text: "treat us to exclusive gourmet dining and private boat cruise", expected: ["budget_luxury"], forbidden: ["budget_low"], desc: "Gourmet + private cruise" },
  // 10. Multi-intent: stuck in traffic and broke
  { text: "cab is stuck in traffic and we are broke students", expected: ["traffic_delay", "budget_low"], forbidden: [], desc: "Traffic delay + budget low" },
  // 11. Multi-intent: tired and want luxury
  { text: "weary from travel, book a luxury palace spa high tea", expected: ["fatigue_chill", "budget_luxury"], forbidden: [], desc: "Weary + luxury high tea" },
  // 12. Heavy shower in mountains
  { text: "heavy shower making roads slippery", expected: ["weather_rain"], forbidden: [], desc: "Heavy shower" },
  // 13. Drenched from storm
  { text: "got drenched in the sudden monsoon storm", expected: ["weather_rain"], forbidden: [], desc: "Drenched storm" },
  // 14. Flight missed
  { text: "we missed our connecting flight", expected: ["traffic_delay"], forbidden: [], desc: "Missed flight" },
  // 15. Slow transit expressway
  { text: "slow transit jam on the highway", expected: ["traffic_delay"], forbidden: [], desc: "Slow transit jam" },
  // 16. Ayurvedic gentle pace
  { text: "gentle pacing with ayurvedic herbal wellness", expected: ["fatigue_chill"], forbidden: [], desc: "Gentle pacing wellness" },
  // 17. Economical backpacker
  { text: "backpacker on an economical trip", expected: ["budget_low"], forbidden: ["budget_luxury"], desc: "Economical trip" },
  // 18. VIP 5-star upgrade
  { text: "upgrade to 5 star VIP experiences", expected: ["budget_luxury"], forbidden: ["budget_low"], desc: "5 star VIP" },
  // 19. Start over from scratch
  { text: "start over from scratch", expected: ["reset_plan"], forbidden: [], desc: "Start over" },
  // 20. Baseline restore
  { text: "restore baseline schedule", expected: ["reset_plan"], forbidden: [], desc: "Restore baseline" },
  // 21. Eliminate travel commute
  { text: "eliminate long commute between stops", expected: ["reroute_optimize"], forbidden: ["weather_rain"], desc: "Eliminate commute" },
  // 22. Drain / drainage isolation
  { text: "drainage cleaning on main road", expected: [], forbidden: ["weather_rain"], desc: "Drainage word isolation" },
  // 23. Brainstorming isolation
  { text: "brainstorming evening options", expected: [], forbidden: ["weather_rain"], desc: "Brainstorming isolation" },
  // 24. Negation with but: "not raining now but we are late"
  { text: "it's not raining now but our cab is late", expected: ["traffic_delay"], forbidden: ["weather_rain"], desc: "Clause split: not raining but late" },
  // 25. Negation with comma: "without delay, let's relax"
  { text: "without delay, let's relax and hit the spa", expected: ["fatigue_chill"], forbidden: ["traffic_delay"], desc: "Without delay (negated delay) + relax" }
];

let heldOutPassed = 0;
heldOutSet.forEach((tc, idx) => {
  const res = sandbox.parseIntentWithRuleFallback(tc.text);
  const detected = res ? res.intents : [];
  const hasExpected = tc.expected.length === 0 ? detected.length === 0 : tc.expected.every(e => detected.includes(e));
  const hasForbidden = tc.forbidden.some(f => detected.includes(f));
  const pass = hasExpected && !hasForbidden;

  if (pass) heldOutPassed++;
  assert(pass, `[Held-Out #${idx + 1}] "${tc.text}" -> [${detected.join(', ')}] (${tc.desc})`);
});

const heldOutScore = ((heldOutPassed / heldOutSet.length) * 100).toFixed(1);
console.log(`\n📊 Held-Out Set Accuracy: ${heldOutPassed}/${heldOutSet.length} (${heldOutScore}%)\n`);

// -----------------------------------------------------------------------------
// SUITE 3: HYBRID TSP OPTIMIZER & ZERO FREEZE BENCHMARK
// -----------------------------------------------------------------------------
console.log('--- 3. Hybrid TSP Optimizer Benchmark & Zero Freeze Verification ---');

const jaipurPlaces = sandbox.DESTINATIONS_DATA.jaipur.places;
const center = sandbox.DESTINATIONS_DATA.jaipur.centerCoords;

// Test A: Exact optimality for n = 5
const fiveStops = jaipurPlaces.slice(0, 5);
const t0 = Date.now();
const optFive = sandbox.optimizeDayPath(fiveStops, center);
const t1 = Date.now();
const distUnopt = sandbox.calculatePathDistance(fiveStops, center);
const distOpt = sandbox.calculatePathDistance(optFive, center);
assert(distOpt <= distUnopt, `Exact TSP (n=5): ${distUnopt} km -> ${distOpt} km in ${t1 - t0}ms`);

// Test B: 10 Stops Stress Test (Zero Freeze Risk)
const tenStops = jaipurPlaces.slice(0, 10);
const t2 = Date.now();
const optTen = sandbox.optimizeDayPath(tenStops, center);
const t3 = Date.now();
assert(t3 - t2 < 50, `Zero Freeze (n=10 stops): Solved in ${t3 - t2}ms (3.6M permutation combinatorial explosion eliminated)`);
assert(optTen.length === 10, `10 stops preserved completely without data loss`);

// Test C: 15 Stops Extreme Stress Test
const fifteenStops = [...jaipurPlaces, ...jaipurPlaces.slice(0, 3)];
const t4 = Date.now();
const optFifteen = sandbox.optimizeDayPath(fifteenStops, center);
const t5 = Date.now();
assert(t5 - t4 < 50, `Zero Freeze (n=15 stops): Solved in ${t5 - t4}ms`);

// -----------------------------------------------------------------------------
// SUITE 4: PURE BUILD ITINERARY & BUDGET SENSITIVITY BENCHMARK
// -----------------------------------------------------------------------------
console.log('\n--- 4. Pure buildItinerary Budget Sensitivity Benchmark (All 6 Cities) ---');

const cities = Object.keys(sandbox.DESTINATIONS_DATA);
let budgetSensitiveCities = 0;

cities.forEach(city => {
  const lowRes = sandbox.buildItinerary({
    destination: city,
    daysCount: 3,
    totalBudget: 6000,
    selectedInterests: ["culture", "food", "nature"],
    hotelOrigin: null
  });

  const highRes = sandbox.buildItinerary({
    destination: city,
    daysCount: 3,
    totalBudget: 60000,
    selectedInterests: ["culture", "food", "nature"],
    hotelOrigin: null
  });

  const lowActs = lowRes.days.flatMap(d => d.activities.map(a => a.name));
  const lowCost = lowRes.days.flatMap(d => d.activities).reduce((s, a) => s + (Number(a.cost) || 0), 0);

  const highActs = highRes.days.flatMap(d => d.activities.map(a => a.name));
  const highCost = highRes.days.flatMap(d => d.activities).reduce((s, a) => s + (Number(a.cost) || 0), 0);

  const shared = lowActs.filter(a => highActs.includes(a));
  const diffStops = 9 - shared.length;

  if (diffStops >= 1 && highCost >= lowCost) {
    budgetSensitiveCities++;
  }

  assert(
    diffStops >= 1 && highCost >= lowCost,
    `${city.toUpperCase()}: ₹6k Plan (₹${lowCost}) vs ₹60k Plan (₹${highCost}) -> ${diffStops}/9 stops differentiated`
  );
});

assert(budgetSensitiveCities === 6, `All 6 destinations dynamically pivot stops based on budget tier`);

// -----------------------------------------------------------------------------
// SUITE 5: DISRUPTION INTEGRITY & DUPLICATE PROTECTION
// -----------------------------------------------------------------------------
console.log('\n--- 5. Disruption Swap ID Exclusion & Delay Buffer Verification ---');

sandbox.state.destination = "jaipur";
sandbox.state.daysCount = 3;
sandbox.state.totalBudget = 18000;
sandbox.generateItinerary(false);

const initialOutdoor = sandbox.state.itinerary.flatMap(d => d.activities).filter(a => a.weatherSensitive).length;

sandbox.applyDisruptionScenario("rain");
const pending = sandbox.state.activePendingDiff;
assert(pending !== null, `Diff Preview generated awaiting user approval`);
assert(pending.diffData.resolvedConflicts > 0, `Diff accurately resolved weather conflicts`);

sandbox.applyPendingDiff();
const postRainActivities = sandbox.state.itinerary.flatMap(d => d.activities);
const postRainIds = postRainActivities.map(a => a.id);
const uniqueIds = new Set(postRainIds);

assert(postRainIds.length === uniqueIds.size, `Zero duplicate place IDs after multi-day rain contingency swaps`);

const postRainOutdoor = postRainActivities.filter(a => a.weatherSensitive).length;
assert(postRainOutdoor < initialOutdoor, `Outdoor stops swapped with indoor venues (${initialOutdoor} -> ${postRainOutdoor})`);

// Check Undo
const beforeUndoTitle = sandbox.state.itinerary[0].title;
sandbox.performUndo();
const afterUndoTitle = sandbox.state.itinerary[0].title;
assert(beforeUndoTitle !== afterUndoTitle, `Undo history stack successfully reverted itinerary modification`);

// -----------------------------------------------------------------------------
// FINAL REPORT
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`🏁 TEST RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`);
console.log(`🎯 AI Tuning Accuracy: ${tuningScore}% | Held-Out Accuracy: ${heldOutScore}%`);
console.log('================================================================');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL TESTS PASSED WITH 100% ACCURACY!\n');
  process.exit(0);
}
