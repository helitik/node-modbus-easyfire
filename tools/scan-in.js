// scan-in.js — READ-ONLY dump of INPUT REGISTERS (Modbus function 04),
// whereas scan.js / the exporter read HOLDING REGISTERS (function 03).
// Goal: check whether the mode (Selector) or the setpoints (ref day 21 / night 19 /
// flow 20) live in the input-register space rather than holding.
// Usage: node tools/scan-in.js [start=2300] [end=2494]

import Modbus from 'jsmodbus';
import net from 'net';
import { MODBUS_OPTIONS } from '../src/config.js';

const start = parseInt(process.argv[2] || '2300', 10);
const end = parseInt(process.argv[3] || '2494', 10);
const CHUNK = 100;
const toI16 = (u) => (u > 32767 ? u - 65536 : u);
const WANT = new Set([21, 210, 19, 190, 20, 200, 22, 220]); // plausible setpoints

const socket = new net.Socket();
const client = new Modbus.client.TCP(socket, MODBUS_OPTIONS.unitId);
socket.on('error', (e) => {
  console.error('socket error:', e.message);
  process.exit(1);
});

socket.connect(MODBUS_OPTIONS.port, MODBUS_OPTIONS.host, async () => {
  let ok = 0;
  let firstErr = null;
  for (let base = start; base <= end; base += CHUNK) {
    const count = Math.min(CHUNK, end - base + 1);
    try {
      const resp = await client.readInputRegisters(base, count);
      const buf = resp.response._body._valuesAsBuffer;
      for (let i = 0; i < count; i++) {
        const u = buf.readUInt16BE(i * 2);
        const off = base + i;
        let hint = '';
        if (WANT.has(u)) hint = ' <<< plausible setpoint';
        else if (toI16(u) >= 0 && toI16(u) <= 10) hint = ' (code/mode?)';
        if (hint) console.log(`${off}\t${toI16(u)}${hint}`);
        ok++;
      }
    } catch (e) {
      if (!firstErr) firstErr = e.message;
    }
  }
  console.log(`\n[input registers read without error: ${ok}; first error: ${firstErr || 'none'}]`);
  socket.end();
  process.exit(0);
});
