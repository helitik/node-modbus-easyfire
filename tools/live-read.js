// LIVE Modbus reader for the KWB DIY thermostat (calibration / dithering).
// Reads HC1RoomTemperature (2443), HC1OperatingState (1512) and
// HC1RoomReferenceActive (1515) directly — WITHOUT going through the scraper cache.
//
// Usage:
//   node tools/live-read.js              -> one read, format "ts raw_room state raw_setp"
//   node tools/live-read.js --json       -> one read as JSON
//   node tools/live-read.js --watch [s]  -> streaming every s seconds (default 2)
//
// Connection settings reused from the project (.env / config). Transient socket
// per read (like the exporter) -> coexists with the scraper.

import Modbus from 'jsmodbus';
import net from 'net';
import { MODBUS_OPTIONS } from '../src/config.js';

function readOnce() {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const client = new Modbus.client.TCP(socket, MODBUS_OPTIONS.unitId);
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('timeout'));
    }, 4000);
    socket.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    socket.connect(MODBUS_OPTIONS.port, MODBUS_OPTIONS.host, async () => {
      try {
        const a = await client.readHoldingRegisters(2442, 4); // 2442 outer,2443 room,2444 ff,2445 pump
        const b = await client.readHoldingRegisters(1512, 4); // 1512 state,...,1515 setpoint
        const ba = a.response._body._valuesAsBuffer;
        const bb = b.response._body._valuesAsBuffer;
        const room = ba.readInt16BE(2); // 2443 = +1 reg
        const state = bb.readInt16BE(0); // 1512
        const setp = bb.readInt16BE(6); // 1515 = +3 reg
        clearTimeout(timer);
        socket.end();
        resolve({ room, state, setp });
      } catch (e) {
        clearTimeout(timer);
        socket.destroy();
        reject(e);
      }
    });
  });
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const watch = args.includes('--watch');
const interval = parseInt(args.find((a) => /^\d+$/.test(a)) || '2', 10) * 1000;

async function tick() {
  try {
    const { room, state, setp } = await readOnce();
    const ts = new Date().toISOString();
    if (asJson) {
      console.log(JSON.stringify({ ts, room, state, setp, room_c: room / 10, setp_c: setp / 10 }));
    } else {
      console.log(
        `${ts} room=${room} (${(room / 10).toFixed(1)}C) state=${state} setp=${setp} (${(setp / 10).toFixed(1)}C)`,
      );
    }
  } catch (e) {
    console.log(`${new Date().toISOString()} ERR ${e.message}`);
  }
}

if (watch) {
  await tick();
  setInterval(tick, interval);
} else {
  await tick();
  process.exit(0);
}
