import assert from 'node:assert/strict';
import {
  breakEvenProbability, compareScenarios, expectedProfit, histogram, runIteration,
  seededRandom, sensitivityGrid, simulate, summarize, validateScenario,
} from '../js/engine.js';

const scenario = { name: 'Launch', opportunities: 100, successProbability: .25, revenuePerSuccess: 80, costPerOpportunity: 12, fixedCost: 300 };
assert.deepEqual(validateScenario(scenario), scenario);
assert.equal(expectedProfit(scenario), 500);
assert.equal(breakEvenProbability(scenario), .1875);

const first = seededRandom(42);
const second = seededRandom(42);
assert.deepEqual(Array.from({ length: 5 }, first), Array.from({ length: 5 }, second));
assert.deepEqual(runIteration({ ...scenario, opportunities: 3 }, () => .1), { successes: 3, revenue: 240, cost: 336, profit: -96 });

const result = simulate(scenario, { iterations: 1000, seed: 7 });
const repeat = simulate(scenario, { iterations: 1000, seed: 7 });
assert.deepEqual(result.profits, repeat.profits);
assert.equal(result.profits.length, 1000);
assert.ok(result.summary.probabilityOfProfit > 0 && result.summary.probabilityOfProfit < 1);
assert.equal(result.histogram.reduce((sum, bin) => sum + bin.count, 0), 1000);

assert.deepEqual(summarize([1, 2, 3, 4]), { mean: 2.5, median: 2.5, p05: 1.15, p95: 3.8499999999999996, standardDeviation: Math.sqrt(1.25), probabilityOfProfit: 1, minimum: 1, maximum: 4 });
assert.equal(histogram([5, 5, 5], 3).reduce((sum, bin) => sum + bin.count, 0), 3);
assert.equal(sensitivityGrid(scenario).values.length, 9);

const comparison = compareScenarios(scenario, { ...scenario, successProbability: .4 }, { iterations: 1000, seed: 3 });
assert.equal(comparison.winnerByMean, 'b');
assert.ok(comparison.meanDifference < 0);

assert.throws(() => validateScenario({ ...scenario, successProbability: 2 }), /between 0 and 1/);
assert.throws(() => simulate(scenario, { iterations: 10 }), /iterations/);
console.log('Decision simulation engine tests passed.');
