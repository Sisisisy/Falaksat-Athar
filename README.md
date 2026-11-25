# ATHAR ground console

Interactive pipeline telemetry demo for FalakSat’s SARI-II mission concept. Five simulated field stations report across a 10 km corridor in Al-Ahsa. All telemetry, contacts and receipts are synthetic.

## Run the demo

Open `index.html` in a modern browser. All assets are local. For a local web server, run `python3 -m http.server 8000` from the repository root and visit `http://localhost:8000`. No installation, API keys or build step is required.

## Presenter walkthrough

1. Start with the selected pressure alert at Site 03. The sample is 60.65 bar against a simulated reference median of 66.74 bar.
2. Inspect the gauge, time series and ground analysis. The gauge displays the anomaly score divided by the model threshold. Scores above one trigger a flag. The recommendation is a check for the operator to perform.
3. Select a different station, channel or flagged record. The station bars count flagged records and the channel chart counts individual flags across all stations.
4. Replay a contact to receive the next 120 records, store them, return receipts and simulate customer acceptance.
5. Download the raw CSV, or filter the received records and export the selected subset. Each row includes the example 24-byte packet in hexadecimal.

## Source

- `index.html` and `style.css` define the dashboard and its responsive layout.
- `model.js` generates deterministic samples, estimates the detector threshold and encodes records.
- `charts.js` renders the gauge, station counts and channel distribution.
- `app.js` handles alert selection, trends, contact replay and data exports.

To serve with GitHub Pages, select the repository’s main branch and root folder as the publishing source. The root includes a .nojekyll file. The included Git bundle can also be cloned locally with `git clone ../athar-ground-console.bundle` from a separate working directory, supplying the actual bundle path.
