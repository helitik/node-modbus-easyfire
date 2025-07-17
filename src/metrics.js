// Prometheus metrics setup and update logic using ES modules

import client from 'prom-client';
import { registerMap } from './registerMap.js';

/**
 * Convert a CamelCase name and optional unit into snake_case metric name.
 * @param {string} name - Register name in CamelCase.
 * @param {string} [unit] - Optional unit string (e.g., '°C', '%').
 * @returns {string} Prometheus-friendly metric name.
 */
function metricName(name, unit) {
  let n = name
    .replace(/([a-z])([A-Z])/g, '$1_$2') // CamelCase to snake_case
    .replace(/\W+/g, '_') // non-alphanumeric -> underscore
    .toLowerCase();

  if (unit) {
    const u = unit
      .replace('°C', 'celsius')
      .replace('%', 'percent')
      .replace(/seconds?/, 'seconds')
      .replace(/hour/, 'hours')
      .toLowerCase();
    n += `_${u}`;
  }

  return n;
}

// Create one Gauge per register in the map
export const gauges = {};
registerMap.forEach((reg) => {
  const { name, unit } = reg;
  const promName = metricName(name, unit);
  gauges[name] = new client.Gauge({
    name: promName,
    help: `${name}${unit ? ` (${unit})` : ''}`,
  });
});

/**
 * Update all Prometheus gauges based on the latest Modbus read values.
 * @param {Object} values - Mapping from register names to numeric or {value, unit}.
 */
export function updateMetrics(values) {
  Object.entries(values).forEach(([name, val]) => {
    const gauge = gauges[name];
    if (!gauge) return;

    const numeric = typeof val === 'object' ? val.value : val;
    gauge.set(numeric);
  });
}

// Optional: expose default metrics (nodejs process, GC, etc.)
client.collectDefaultMetrics();
