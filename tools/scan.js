// scan.js — READ-ONLY dump of a range of KWB holding registers.
// Used to locate undocumented registers (operating mode "Selector" day/night,
// room/flow day/night setpoints, etc.) that the webUI reads but that are not
// in registerMap.js.
//
// Usage:
//   node tools/scan.js [start=2300] [end=2520] [label]
// Day -> Night diff example:
//   node tools/scan.js 2440 2500 day    (snapshot while the selector = day)
//   ... switch day -> night in the webUI, wait ~10 s ...
//   node tools/scan.js 2440 2500 night
//   diff /tmp/kwb-scan-day.txt /tmp/kwb-scan-night.txt
//
// readHoldingRegisters = Modbus function 3 (pure read) -> no write risk.

import Modbus from 'jsmodbus';
import net from 'net';
import fs from 'fs';
import { MODBUS_OPTIONS } from '../src/config.js';

const start = parseInt(process.argv[2] || '2300', 10);
const end = parseInt(process.argv[3] || '2520', 10);
const label = process.argv[4] || '';
const CHUNK = 100;

const toI16 = (u) => (u > 32767 ? u - 65536 : u);

function hint(u) {
  const i = toI16(u);
  if (i >= 0 && i <= 10) return ' <- code/mode?';
  if (u >= 100 && u <= 400) return ` (~${(u / 10).toFixed(1)} if /10)`;
  return '';
}

const socket = new net.Socket();
const client = new Modbus.client.TCP(socket, MODBUS_OPTIONS.unitId);

socket.on('error', (e) => {
  console.error('socket error:', e.message);
  process.exit(1);
});

async function read1(off) {
  try {
    const r = await client.readHoldingRegisters(off, 1);
    return r.response._body._valuesAsBuffer.readUInt16BE(0);
  } catch {
    return null;
  }
}

socket.connect(MODBUS_OPTIONS.port, MODBUS_OPTIONS.host, async () => {
  const lines = [];
  for (let base = start; base <= end; base += CHUNK) {
    const count = Math.min(CHUNK, end - base + 1);
    let buf = null;
    try {
      const resp = await client.readHoldingRegisters(base, count);
      buf = resp.response._body._valuesAsBuffer;
    } catch {
      buf = null; // block rejected -> fall back to register-by-register reads
    }
    for (let i = 0; i < count; i++) {
      const off = base + i;
      const u = buf ? buf.readUInt16BE(i * 2) : await read1(off);
      lines.push(u === null ? `${off}\tERR` : `${off}\t${toI16(u)}${hint(u)}`);
    }
  }
  const out = lines.join('\n') + '\n';
  process.stdout.write(out);
  if (label) {
    const path = `/tmp/kwb-scan-${label}.txt`;
    fs.writeFileSync(path, out);
    console.error(`\n[wrote ${path}]`);
  }
  socket.end();
  process.exit(0);
});
