// Main entry point: polls Modbus, updates Prometheus metrics, and serves HTTP endpoints

import express from 'express';
import clientProm from 'prom-client';
import { readAll } from './modbusClient.js';
import { updateMetrics } from './metrics.js';
import { logger } from './logger.js';
import { SCRAPE_INTERVAL, HTTP_PORT } from './config.js';

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
      ...data
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

// Start HTTP server
app.listen(HTTP_PORT, () => {
  logger.info(`🚀 Server listening on port ${HTTP_PORT}`);
  logger.info('   - /data    => raw JSON data');
  logger.info('   - /metrics => Prometheus metrics');
});
