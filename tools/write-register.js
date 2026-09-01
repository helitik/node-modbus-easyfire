// Writes ONE register (FC06) — test tool, to be used only on registers
// identified as parameters (4000+ bank), never on measurements.
// Usage: node tools/write-register.js <addr> <value>
// Reads the register before and after, writes only with the --yes flag.

import Modbus from 'jsmodbus';
import net from 'net';
import { MODBUS_OPTIONS } from '../src/config.js';

const addr = parseInt(process.argv[2], 10);
const value = parseInt(process.argv[3], 10);
const yes = process.argv.includes('--yes');
if (isNaN(addr) || isNaN(value)) {
  console.error('usage: write-register.js <addr> <value> --yes');
  process.exit(1);
}

const socket = new net.Socket();
const client = new Modbus.client.TCP(socket, MODBUS_OPTIONS.unitId);
const timer = setTimeout(() => {
  console.error('timeout');
  process.exit(2);
}, 6000);
socket.on('error', (e) => {
  console.error('socket:', e.message);
  process.exit(2);
});

socket.connect(MODBUS_OPTIONS.port, MODBUS_OPTIONS.host, async () => {
  try {
    const before = (
      await client.readHoldingRegisters(addr, 1)
    ).response._body._valuesAsBuffer.readInt16BE(0);
    console.log(`before: ${addr} = ${before}`);
    if (!yes) {
      console.log('(dry-run, add --yes to write)');
      process.exit(0);
    }
    const w = await client.writeSingleRegister(addr, value);
    console.log(
      `write : FC06 ${addr} <- ${value} : response ${JSON.stringify(w.response._body._value ?? w.response._body)}`,
    );
    const after = (
      await client.readHoldingRegisters(addr, 1)
    ).response._body._valuesAsBuffer.readInt16BE(0);
    console.log(`after : ${addr} = ${after}`);
    clearTimeout(timer);
    socket.end();
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.err || e.message || JSON.stringify(e).slice(0, 200));
    clearTimeout(timer);
    socket.destroy();
    process.exit(3);
  }
});
