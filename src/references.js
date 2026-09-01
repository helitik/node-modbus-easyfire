// Read/write access to the HC1 day/night reference temperatures (room setpoints).
// Reverse-engineered parameter bank, offsets 4035/4036 — the same values the KWB
// Comfort Online portal edits ("Temp. de référence jour/nuit"). Writes are rare by
// design (human-initiated only): the register is likely EEPROM-backed.
// Each operation uses a transient socket so it coexists with the scraper cycle.

import Modbus from 'jsmodbus';
import net from 'net';
import { MODBUS_OPTIONS } from './config.js';
import { logger } from './logger.js';

export const REFERENCE_REGISTERS = { day: 4035, night: 4036 };

// Software bounds, in °C. Deliberately conservative: below 10 the boiler's own
// frost-protection mode is the right tool, above 25 is never a sane room setpoint.
export const REFERENCE_MIN_C = 10.0;
export const REFERENCE_MAX_C = 25.0;

function withClient(fn) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const client = new Modbus.client.TCP(socket, MODBUS_OPTIONS.unitId);
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('modbus timeout'));
    }, MODBUS_OPTIONS.timeout);
    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    socket.connect(MODBUS_OPTIONS.port, MODBUS_OPTIONS.host, async () => {
      try {
        resolve(await fn(client));
      } catch (err) {
        reject(new Error(err.err || err.message || 'modbus exception'));
      } finally {
        clearTimeout(timer);
        socket.end();
      }
    });
  });
}

/**
 * Read both reference temperatures.
 * @returns {Promise<{day: number, night: number}>} Values in °C.
 */
export function readReferences() {
  return withClient(async (client) => {
    const resp = await client.readHoldingRegisters(REFERENCE_REGISTERS.day, 2);
    const buf = resp.response._body._valuesAsBuffer;
    return {
      day: buf.readInt16BE(0) / 10,
      night: buf.readInt16BE(2) / 10,
    };
  });
}

/**
 * Write one reference temperature. Skips the write when the register already
 * holds the requested value (EEPROM protection), verifies by reading back.
 * @param {'day'|'night'} which - Target register.
 * @param {number} tempC - Requested value in °C (0.1 resolution).
 * @returns {Promise<{value: number, written: boolean}>}
 * @throws {RangeError} On out-of-bounds or non-numeric input.
 */
export function writeReference(which, tempC) {
  const offset = REFERENCE_REGISTERS[which];
  if (!offset) throw new RangeError(`unknown reference '${which}' (day|night)`);
  if (typeof tempC !== 'number' || !Number.isFinite(tempC)) {
    throw new RangeError(`${which}: value must be a number in °C`);
  }
  const raw = Math.round(tempC * 10);
  if (raw < REFERENCE_MIN_C * 10 || raw > REFERENCE_MAX_C * 10) {
    throw new RangeError(
      `${which}: ${tempC} °C out of bounds [${REFERENCE_MIN_C}, ${REFERENCE_MAX_C}]`,
    );
  }

  return withClient(async (client) => {
    const before = (
      await client.readHoldingRegisters(offset, 1)
    ).response._body._valuesAsBuffer.readInt16BE(0);
    if (before === raw) {
      return { value: raw / 10, written: false };
    }
    await client.writeSingleRegister(offset, raw);
    const after = (
      await client.readHoldingRegisters(offset, 1)
    ).response._body._valuesAsBuffer.readInt16BE(0);
    if (after !== raw) {
      throw new Error(`${which}: readback mismatch (wrote ${raw}, read ${after})`);
    }
    logger.info(`✏️  Reference ${which} (reg ${offset}): ${before / 10} -> ${raw / 10} °C`);
    return { value: raw / 10, written: true };
  });
}
