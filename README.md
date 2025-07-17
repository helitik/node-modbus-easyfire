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