import dotenv from 'dotenv';
dotenv.config();

export const MODBUS_OPTIONS = {
  host: process.env.MODBUS_HOST,
  port: parseInt(process.env.MODBUS_PORT, 10),
  unitId: parseInt(process.env.MODBUS_UNIT_ID, 10),
  timeout: 5000,
};

export const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3000', 10);
export const SCRAPE_INTERVAL = parseInt(process.env.SCRAPE_INTERVAL || '60', 10);
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';