/* Node tests for the Network Geometry & Transitivity Inspector engine.
 * Pure graph logic — no statistics, fully deterministic. Run: node tests.js
 *
 * Reference values are hand-derived from the graph definition of each fixture
 * (a triangle has 3 nodes / 3 edges / density 1, etc.); no external library is
 * needed because nothing here is statistical.
 */
var G = require('./engine.js');
var pass = 0, fail = 0;
function ok(name, cond) { if (cond) pass++; else { console.log('FAIL ' + name); fail++; } }
function eq(name, got, want) {
  if (got === want) pass++;
  else { console.log('FAIL ' + name + ': got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want)); fail++; }
}
function approx(name, got, want, tol) {
  tol = tol == null ? 1e-9 : tol;
  if (got != null && isFinite(got) && Math.abs(got - want) <= tol) pass++;
  else { console.log('FAIL ' + name + ': got ' + got + ' want ' + want); fail++; }
}
function deg(rep, id) {
  var nd = rep.nodes.filter(function (n) { return n.id === id; })[0];
  return nd ? nd.degree : null;
}
function edgeN(rep, a, b) {
  var k = G.edgeKey(a, b);
  var e = rep.edges.filter(function (x) { return G.edgeKey(x.a, x.b) === k; })[0];
  return e ? e.n : null;
}

// --- connected triangle: 1 component, feasible, 3 nodes / 3 edges -----------
var tri = G.inspect('A, B\nB, C\nA, C');
eq('triangle nodes', tri.nNodes, 3);
eq('triangle edges', tri.nEdges, 3);
eq('triangle components', tri.components, 1);
ok('triangle feasible', tri.nmaFeasible === true);
approx('triangle density = 1', tri.density, 1.0);

// --- disconnected A-B, C-D: 2 components, not feasible -----------------------
var disc = G.inspect('A, B\nC, D');
eq('disconnected components', disc.components, 2);
eq('disconnected nodes', disc.nNodes, 4);
ok('disconnected NOT feasible', disc.nmaFeasible === false);
ok('disconnected has reason', disc.feasibilityReasons.some(function (r) { return /disconnected/i.test(r); }));

// --- two-node connected network is NOT an NMA (>=3 rule) --------------------
var pair = G.inspect('A, B');
eq('pair components', pair.components, 1);
ok('pair connected but not feasible', pair.connected === true && pair.nmaFeasible === false);

// --- multi-arm trial "T1: A,B,C" -> 3 edges + multiArm=1 --------------------
var ma = G.inspect('T1: A, B, C');
eq('multi-arm nodes', ma.nNodes, 3);
eq('multi-arm edges (pairwise)', ma.nEdges, 3);
eq('multi-arm trial count', ma.multiArmTrials, 1);
eq('multi-arm trial id recorded', ma.multiArmList[0].trialId, 'T1');
ok('multi-arm feasible (triangle)', ma.nmaFeasible === true);

// --- parallel-edge aggregation sums study counts ----------------------------
// A-B appears as weight 2 and weight 3 -> aggregated n = 5; plus B-C, A-C to connect.
var agg = G.inspect('A, B, 2\nA, B, 3\nB, C\nA, C');
eq('aggregated A-B edge n', edgeN(agg, 'A', 'B'), 5);
eq('aggregated edge count (parallel merged)', agg.nEdges, 3);
eq('total studies summed', agg.totalStudies, 2 + 3 + 1 + 1);

// --- degree correctness -----------------------------------------------------
eq('triangle degree A', deg(tri, 'A'), 2);
eq('triangle degree B', deg(tri, 'B'), 2);

// --- star network: hub is most-connected -----------------------------------
var star = G.inspect('H, A\nH, B\nH, C\nH, D');
eq('star most-connected is hub', star.mostConnected.id, 'H');
eq('star hub degree', star.mostConnected.degree, 4);
eq('star nodes', star.nNodes, 5);
eq('star edges', star.nEdges, 4);
// star density = 4 / C(5,2) = 4/10 = 0.4
approx('star density', star.density, 0.4);
ok('star feasible (connected, >=3)', star.nmaFeasible === true);

// --- checklist is informational, defaults to unconfirmed --------------------
ok('checklist non-empty', tri.checklist.length >= 3);
ok('checklist defaults unconfirmed (null)', tri.checklist.every(function (c) { return c.confirmed === null; }));

// --- count token only applies to plain 2-treatment lines --------------------
// "T2: A, B, 3" is a colon-labelled trial -> "3" is treated as a THIRD ARM,
// not a study count (multi-arm trials are weight 1 per pairwise edge).
var trick = G.inspect('T2: A, B, 3');
eq('colon line treats trailing int as arm', trick.nNodes, 3);
eq('colon line -> 3 pairwise edges', trick.nEdges, 3);

// --- parse errors: a line with one treatment is rejected, not crashed -------
var bad = G.inspect('LoneTreatment\nA, B\nB, C\nA, C');
ok('lone-treatment line reported as error', bad.errors.length === 1);
eq('valid triangle survives bad line', bad.nNodes, 3);

// --- empty input is handled (no nodes, not feasible) ------------------------
var empty = G.inspect('   \n# a comment\n');
eq('empty input nodes', empty.nNodes, 0);
ok('empty input not feasible', empty.nmaFeasible === false);
ok('empty input density null (n<2)', empty.density === null);

// --- whitespace + case sensitivity ------------------------------------------
var ws = G.inspect('  Drug A ,  Drug B \nDrug B, Drug C\nDrug A, Drug C');
eq('whitespace trimmed -> 3 nodes', ws.nNodes, 3);
ok('label preserved with spaces', ws.nodes.some(function (n) { return n.id === 'Drug A'; }));


// --- fail closed: malformed unlabelled count fields must never invent arms --
[
  'A, B, 0', 'A, B, -2', 'A, B, 2.5', 'A, B, 1e3',
  'A, B, Infinity', 'A, B, NaN', 'A, B, 9007199254740992',
  'A, B, C', 'A, B, X, Y', 'A, B,', 'A, , B'
].forEach(function (text) {
  var result = G.inspect(text);
  eq('invalid input has one error: ' + text, result.errors.length, 1);
  eq('invalid input creates no arms: ' + text, result.nNodes, 0);
  ok('invalid input cannot claim NMA feasible: ' + text, !result.nmaFeasible);
});

// Valid triangle plus malformed input must not claim feasibility for partial data.
var partial = G.inspect('A, B\nB, C\nC, A\nA, B, 0');
eq('partial input still contains only valid triangle arms', partial.nNodes, 3);
eq('partial input reports malformed source line', partial.errors.length, 1);
ok('partial input fails closed on feasibility', !partial.nmaFeasible);
ok('partial input includes explanatory reason', partial.feasibilityReasons.some(function (r) {
  return /invalid input/i.test(r);
}));

var validCount = G.inspect('A, B, 03\nB, C\nC, A');
eq('valid leading-zero count preserves study sum', validCount.totalStudies, 5);
ok('valid counted triangle remains feasible', validCount.nmaFeasible);
var numericArm = G.inspect('T9: A, B, 0');
eq('numeric treatment arm allowed with trial ID', numericArm.nNodes, 3);
ok('labelled numeric multiarm remains feasible', numericArm.nmaFeasible);

var overflow = G.inspect('A, B, 9007199254740991\nB, C, 2');
eq('aggregate unsafe study count is rejected', overflow.errors.length, 1);
ok('unsafe aggregate does not return feasible', !overflow.nmaFeasible);
eq('unsafe aggregate excludes overflowing line', overflow.totalStudies, 9007199254740991);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
