// Écriture d'UN registre (FC06) — outil de test, à n'utiliser que sur des
// registres identifiés comme paramètres (banc 4000+), jamais sur des mesures.
// Usage : node tools/write-register.js <addr> <valeur>
// Relit le registre avant et après, n'écrit que sur confirmation --yes.

import Modbus from 'jsmodbus';
import net from 'net';
import { MODBUS_OPTIONS } from '../src/config.js';

const addr = parseInt(process.argv[2], 10);
const value = parseInt(process.argv[3], 10);
const yes = process.argv.includes('--yes');
if (isNaN(addr) || isNaN(value)) {
  console.error('usage: write-register.js <addr> <valeur> --yes');
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
    console.log(`avant : ${addr} = ${before}`);
    if (!yes) {
      console.log('(dry-run, ajoute --yes pour écrire)');
      process.exit(0);
    }
    const w = await client.writeSingleRegister(addr, value);
    console.log(
      `write : FC06 ${addr} <- ${value} : réponse ${JSON.stringify(w.response._body._value ?? w.response._body)}`,
    );
    const after = (
      await client.readHoldingRegisters(addr, 1)
    ).response._body._valuesAsBuffer.readInt16BE(0);
    console.log(`après : ${addr} = ${after}`);
    clearTimeout(timer);
    socket.end();
    process.exit(0);
  } catch (e) {
    console.error('ERREUR:', e.err || e.message || JSON.stringify(e).slice(0, 200));
    clearTimeout(timer);
    socket.destroy();
    process.exit(3);
  }
});
