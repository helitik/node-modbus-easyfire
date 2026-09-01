# Documentation

## Contents

- `README.md` (this file): summary of the registers identified outside the official KWB
  documentation, and the method used to find them.
- Full Modbus memory-window dumps (FC03, registers 0-16383) taken before write campaigns
  are kept outside this repository (installation-specific data).

## Registers identified outside the KWB docs

All of these are read as holding registers (FC03), int16 values.

| Register  | Name                                             | Meaning                                                                                   | Status                                                  |
| --------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 1512      | HC1OperatingState                                | Circuit 1 mode: 0 = night, 1 = day, 3 = off (frost protection)                             | Exposed in `src/registerMap.js`                          |
| 1515      | HC1RoomReferenceActive                           | Active room setpoint, value ×10 (210 = 21.0 °C)                                            | Exposed in `src/registerMap.js`                          |
| 4035      | Day room setpoint                                | Value ×10. Goes from 210 to 220 when the day setpoint is changed from 21.0 to 22.0 on the portal | Located 2026-09-01, exposed in `src/registerMap.js` and writable via `/references` |
| 4036      | Night room setpoint                              | Value ×10 (190 = 19.0 °C)                                                                  | Same                                                     |
| 2491-2494 | DHCW0Program, HC0Program, HC1Program, HC2Program | Active schedule profile (0 = Prog 1, 1 = Prog 2). This is NOT the operating mode           | KWB doc "write" sheet, exposed in `src/registerMap.js`   |

The ~1500 bank is the one read by the boiler's native webUI. The 4000+ bank appears to be
the editable-parameter bank (per-circuit blocks of 28 registers). None of these registers
is guaranteed stable across KWB firmware versions.

## Method: differential scan

1. `node tools/scan.js 4000 4100 before`: first snapshot, written to `/tmp/kwb-scan-before.txt`.
2. Change a single parameter on the portal or the webUI, wait ~10 seconds.
3. `node tools/scan.js 4000 4100 after`.
4. `diff /tmp/kwb-scan-before.txt /tmp/kwb-scan-after.txt`: the register that moved is the one
   you are looking for.

This is the method that located 4035 and 4036.

## Writing: precautions

- Always take a full dump before a write campaign (`node tools/scan.js 0 16383 dump`)
  and keep it outside the repository.
- Only write with `tools/write-register.js`, which reads the register before and after
  and writes only with `--yes`.
- Only write to registers identified as parameters (4000+ bank), never to measurements.
- If something goes wrong, restore only the register you wrote, to its original value as
  read from the dump. The other registers are live measurements and cannot be "restored".
