export function seededRandom(seed = 1) {
  let value = Number(seed) >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let sample = value;
    sample = Math.imul(sample ^ (sample >>> 15), sample | 1);
    sample ^= sample + Math.imul(sample ^ (sample >>> 7), sample | 61);
    return ((sample ^ (sample >>> 14)) >>> 0) / 4294967296;
  };
}

export function validateScenario(input) {
  const scenario = {
    name: String(input.name || 'Scenario'),
    opportunities: Number(input.opportunities),
    successProbability: Number(input.successProbability),
    revenuePerSuccess: Number(input.revenuePerSuccess),
    costPerOpportunity: Number(input.costPerOpportunity),
    fixedCost: Number(input.fixedCost),
  };
  if (!Number.isInteger(scenario.opportunities) || scenario.opportunities < 1 || scenario.opportunities > 100_000) throw new Error('opportunities must be an integer from 1 to 100000');
  if (!Number.isFinite(scenario.successProbability) || scenario.successProbability < 0 || scenario.successProbability > 1) throw new Error('successProbability must be between 0 and 1');
  for (const field of ['revenuePerSuccess', 'costPerOpportunity', 'fixedCost']) if (!Number.isFinite(scenario[field]) || scenario[field] < 0) throw new Error(`${field} must be non-negative`);
  return scenario;
}

export function runIteration(input, random = Math.random) {
  const scenario = validateScenario(input);
  let successes = 0;
  for (let index = 0; index < scenario.opportunities; index += 1) if (random() < scenario.successProbability) successes += 1;
  const revenue = successes * scenario.revenuePerSuccess;
  const cost = scenario.fixedCost + scenario.opportunities * scenario.costPerOpportunity;
  return { successes, revenue, cost, profit: revenue - cost };
}

export function quantile(sortedValues, probability) {
  if (!sortedValues.length) throw new Error('values cannot be empty');
  if (probability < 0 || probability > 1) throw new Error('probability must be between 0 and 1');
  const index = (sortedValues.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
}

export function summarize(values) {
  if (!values.length || values.some((value) => !Number.isFinite(value))) throw new Error('values must contain finite numbers');
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return {
    mean,
    median: quantile(sorted, .5),
    p05: quantile(sorted, .05),
    p95: quantile(sorted, .95),
    standardDeviation: Math.sqrt(variance),
    probabilityOfProfit: values.filter((value) => value >= 0).length / values.length,
    minimum: sorted[0],
    maximum: sorted.at(-1),
  };
}

export function histogram(values, bins = 24) {
  if (!Number.isInteger(bins) || bins < 2 || bins > 100) throw new Error('bins must be an integer from 2 to 100');
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = max === min ? 1 : (max - min) / bins;
  const output = Array.from({ length: bins }, (_, index) => ({ from: min + index * width, to: min + (index + 1) * width, count: 0 }));
  for (const value of values) output[Math.min(bins - 1, Math.floor((value - min) / width))].count += 1;
  return output;
}

export function simulate(input, { iterations = 5000, seed = 1 } = {}) {
  if (!Number.isInteger(iterations) || iterations < 100 || iterations > 100_000) throw new Error('iterations must be an integer from 100 to 100000');
  const scenario = validateScenario(input);
  const random = seededRandom(seed);
  const profits = Array.from({ length: iterations }, () => runIteration(scenario, random).profit);
  return { scenario, seed, iterations, profits, summary: summarize(profits), histogram: histogram(profits) };
}

export function expectedProfit(input) {
  const scenario = validateScenario(input);
  return scenario.opportunities * scenario.successProbability * scenario.revenuePerSuccess - scenario.opportunities * scenario.costPerOpportunity - scenario.fixedCost;
}

export function breakEvenProbability(input) {
  const scenario = validateScenario(input);
  if (scenario.revenuePerSuccess === 0) return null;
  return (scenario.opportunities * scenario.costPerOpportunity + scenario.fixedCost) / (scenario.opportunities * scenario.revenuePerSuccess);
}

export function sensitivityGrid(input, { probabilitySteps = 9, revenueSteps = 9, spread = .35 } = {}) {
  const scenario = validateScenario(input);
  const probabilities = Array.from({ length: probabilitySteps }, (_, index) => Math.max(0, Math.min(1, scenario.successProbability * (1 - spread + (2 * spread * index) / (probabilitySteps - 1)))));
  const revenues = Array.from({ length: revenueSteps }, (_, index) => scenario.revenuePerSuccess * (1 - spread + (2 * spread * index) / (revenueSteps - 1)));
  return { probabilities, revenues, values: probabilities.map((probability) => revenues.map((revenue) => expectedProfit({ ...scenario, successProbability: probability, revenuePerSuccess: revenue }))) };
}

export function compareScenarios(left, right, options) {
  const a = simulate(left, options);
  const b = simulate(right, { ...options, seed: Number(options?.seed ?? 1) + 1 });
  return { a, b, winnerByMean: a.summary.mean >= b.summary.mean ? 'a' : 'b', meanDifference: a.summary.mean - b.summary.mean };
}
