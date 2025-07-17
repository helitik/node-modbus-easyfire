// Reads all Modbus registers and returns an object of values

import Modbus from 'jsmodbus';
import net from 'net';
import { MODBUS_OPTIONS } from './config.js';
import { registerMap } from './registerMap.js';
import { logger } from './logger.js';

/**
 * Read all configured Modbus registers in one cycle.
 * @returns {Promise<Object>} Mapping of register names to values.
 */
export async function readAll() {
  const socket = new net.Socket();
  const client = new Modbus.client.TCP(socket, MODBUS_OPTIONS.unitId);

  return new Promise((resolve, reject) => {
    socket.on('error', (err) => reject(err));

    socket.connect(MODBUS_OPTIONS.port, MODBUS_OPTIONS.host, async () => {
      logger.info('🔄 Optimized Modbus read cycle');
      const result = {};

      // Trier les registres
      const sorted = [...registerMap].sort((a, b) => a.offset - b.offset);

      const maxBlockSize = 20;
      let i = 0;

      while (i < sorted.length) {
        const blockStart = sorted[i].offset;
        let blockEnd = blockStart;
        let block = [sorted[i]];

        // Regrouper les registres proches
        for (let j = i + 1; j < sorted.length; j++) {
          const next = sorted[j];
          const last = block[block.length - 1];
          const wordCount = last.type === 'int32' || last.type === 'uint32' ? 2 : 1;

          if (next.offset <= blockEnd + wordCount && (next.offset - blockStart) < maxBlockSize) {
            block.push(next);
            blockEnd = next.offset;
          } else {
            break;
          }
        }

        const blockLength = blockEnd - blockStart + 2; // +2 to ensure 32-bit reads
        logger.info(`📦 Reading block from offset ${blockStart} (length ${blockLength})`);

        try {
          const resp = await client.readHoldingRegisters(blockStart, blockLength);
          const buf = resp.response._body._valuesAsBuffer;

          for (const { offset, name, type, unit, scale = 1 } of block) {
            const relativeOffset = (offset - blockStart) * 2;

            let raw;
            if (type === 'uint16') raw = buf.readUInt16BE(relativeOffset);
            else if (type === 'int16') raw = buf.readInt16BE(relativeOffset);
            else if (type === 'uint32') raw = buf.readUInt32BE(relativeOffset);
            else if (type === 'int32') raw = buf.readInt32BE(relativeOffset);
            else continue;

            const numeric = typeof raw === 'number' ? raw * scale : raw;
            const finalValue = unit ? { value: numeric, unit } : numeric;

            logger.info(`    → ${name}:`, finalValue);
            result[name] = finalValue;
          }
        } catch (err) {
          logger.error(`❌ Error reading block starting at ${blockStart}:`, err.message);
        }

        i += block.length;
      }

      socket.end();
      resolve(result);
    });
  });
}
