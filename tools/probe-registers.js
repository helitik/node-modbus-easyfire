// READ-ONLY probe of arbitrary registers — used to test the Comfort 4 bank (8000+/24000+).
// Usage: node tools/probe-registers.js <[fc:]addr[:count]> [...]   fc = 3 (holding, default) or 4 (input)
// Each address is read individually; a Modbus exception (illegal address)
// is reported, not fatal.

import Modbus from 'jsmodbus';
import net from 'net';
import { MODBUS_OPTIONS } from '../src/config.js';

function readReg(addr, count = 1, fc = 3) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const client = new Modbus.client.TCP(socket, MODBUS_OPTIONS.unitId);
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ addr, err: 'timeout' });
    }, 4000);
    socket.on('error', (e) => {
      clearTimeout(timer);
      resolve({ addr, err: e.message });
    });
    socket.connect(MODBUS_OPTIONS.port, MODBUS_OPTIONS.host, async () => {
      try {
        const fn = fc === 4 ? 'readInputRegisters' : 'readHoldingRegisters';
        const r = await client[fn](addr, count);
        const buf = r.response._body._valuesAsBuffer;
        const vals = [];
        for (let i = 0; i < count; i++) vals.push(buf.readInt16BE(i * 2));
        clearTimeout(timer);
        socket.end();
        resolve({ addr, vals });
      } catch (e) {
        clearTimeout(timer);
        socket.destroy();
        resolve({ addr, err: e.err || e.message || JSON.stringify(e).slice(0, 120) });
      }
    });
  });
}

for (const arg of process.argv.slice(2)) {
  const parts = arg.split(':').map((x) => parseInt(x, 10));
  const [fc, a, c] =
    parts.length >= 2 && (parts[0] === 3 || parts[0] === 4)
      ? [parts[0], parts[1], parts[2] || 1]
      : [3, parts[0], parts[1] || 1];
  const res = await readReg(a, c, fc);
  if (res.err) console.log(`FC${fc} @${res.addr}: ERROR ${res.err}`);
  else console.log(`FC${fc} @${res.addr}: ${res.vals.join(', ')}`);
}
