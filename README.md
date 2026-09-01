# 🔥 node-modbus-easyfire

A lightweight Node.js-based Prometheus exporter for reading Modbus TCP registers from a KWB Easyfire boiler.

## 🚀 Features

- Reads key metrics from your Easyfire boiler over Modbus TCP
- Exposes a `/metrics` endpoint compatible with Prometheus
- Exposes a `/data` endpoint returning raw JSON output
- Docker-ready, with configurable polling interval
- Clean modular code using ES modules

## 📦 Requirements

- Node.js ≥ 18 (ESM support)
- A running Prometheus server (optional: Grafana for dashboards)
- Access to a KWB Easyfire boiler via Modbus TCP

## 🛠️ Setup

```bash
git clone https://github.com/helitik/node-modbus-easyfire.git
cd node-modbus-easyfire
cp .env.example .env
npm install
npm run start
```

## 🧰 Tools

Standalone diagnostic scripts in `tools/`, used to reverse-engineer undocumented registers. They reuse the `.env` connection settings and open their own short-lived socket, so they can run alongside the exporter.

| Script                      | Modbus function | Purpose                                                                                  |
| --------------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| `tools/scan.js`             | FC03 read       | Dump a range of holding registers, optionally save a labelled snapshot for a before/after diff |
| `tools/scan-in.js`          | FC04 read       | Same for input registers                                                                 |
| `tools/probe-registers.js`  | FC03/FC04 read  | Read arbitrary addresses one by one                                                      |
| `tools/live-read.js`        | FC03 read       | Live read of HC1 room temperature, operating state and active setpoint                   |
| `tools/write-register.js`   | FC06 **write**  | Write a single register. Dry-run by default, writes only with `--yes`                    |

⚠️ `write-register.js` is the only script that writes to the boiler. Use it only on registers identified as parameters, never on measurements. See `docs/README.md` for the precautions.

## 📚 Docs

`docs/README.md` summarises the reverse-engineered registers and the differential-scan method. `docs/backups/` holds the register dumps taken before write tests.
