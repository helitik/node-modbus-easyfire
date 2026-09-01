// Main entry point: polls Modbus, updates Prometheus metrics, and serves HTTP endpoints

import express from 'express';
import clientProm from 'prom-client';
import { readAll } from './modbusClient.js';
import { updateMetrics } from './metrics.js';
import { logger } from './logger.js';
import { SCRAPE_INTERVAL, HTTP_PORT, WRITE_TOKEN } from './config.js';
import { readReferences, writeReference, REFERENCE_MIN_C, REFERENCE_MAX_C } from './references.js';

// In-memory storage of last read values
let lastData = {};

/**
 * Perform a single scrape of Modbus registers and update stored data and metrics.
 */
async function scrapeOnce() {
  try {
    const data = await readAll();
    lastData = {
      timestamp: new Date().toISOString(),
      ...data,
    };
    updateMetrics(data);
  } catch (err) {
    logger.error('❌ Modbus scrape error:', err.message);
  }
}

// Initial scrape and schedule subsequent scrapes
scrapeOnce();
setInterval(scrapeOnce, SCRAPE_INTERVAL * 1000);

// Create Express application
const app = express();

// JSON endpoint for raw data
app.get('/data', (req, res) => {
  res.json(lastData);
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', clientProm.register.contentType);
  res.end(await clientProm.register.metrics());
});

// HC1 day/night reference temperatures (room setpoints), live read — not the
// scraper cache, so a GET right after a POST reflects the new value.
app.get('/references', async (req, res) => {
  try {
    res.json(await readReferences());
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Write reference temperatures. Body: { "day": 21.5 } and/or { "night": 18.0 } (°C).
app.post('/references', express.json(), async (req, res) => {
  if (WRITE_TOKEN && req.get('authorization') !== `Bearer ${WRITE_TOKEN}`) {
    return res.status(401).json({ error: 'invalid or missing token' });
  }
  const body = req.body || {};
  const keys = Object.keys(body);
  const unknown = keys.filter((k) => k !== 'day' && k !== 'night');
  if (keys.length === 0 || unknown.length > 0) {
    return res.status(400).json({
      error: `body must contain 'day' and/or 'night' (°C, ${REFERENCE_MIN_C}-${REFERENCE_MAX_C})`,
    });
  }
  const result = {};
  for (const key of keys) {
    try {
      result[key] = await writeReference(key, body[key]);
    } catch (err) {
      const status = err instanceof RangeError ? 400 : 502;
      return res.status(status).json({ error: err.message, done: result });
    }
  }
  res.json(result);
});

// Start HTTP server
app.listen(HTTP_PORT, () => {
  logger.info(`🚀 Server listening on port ${HTTP_PORT}`);
  logger.info('   - /data           => raw JSON data');
  logger.info('   - /metrics        => Prometheus metrics');
  logger.info('   - /references     => GET/POST HC1 day/night room setpoints');
});
