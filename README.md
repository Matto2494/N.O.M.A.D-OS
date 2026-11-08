# NomadOS

A full-screen command centre for your campervan, made for a landscape tablet. It runs inside Home Assistant.

## Install (about 5 minutes)

You need Home Assistant and HACS (the Home Assistant Community Store).

1. In Home Assistant, open **HACS**, tap the three dots at the top right, then **Custom repositories**.
2. Paste the link to this page, choose **Integration** as the type, and press **Add**.
3. Search HACS for **NomadOS** and press **Download**.
4. Restart Home Assistant: **Settings > System**, the power button at the top right, then **Restart**.
5. Go to **Settings > Devices & services > Add integration**, search for **NomadOS** and press **Submit**.
6. **NomadOS** appears in the sidebar. Open it and the setup takes you through the rest.

The setup finds your Victron kit, sensors and smart switches by itself. You check what it found, pick your buttons, add a photo of your van, and press Finish.

## What NomadOS adds to Home Assistant

- The NomadOS page in the sidebar.
- A **NomadOS** device with a Night switch, and, if you have a heater on a smart relay, the heating controls (mode, warm-to temperature, keep warm, battery guard, boost and a thermostat).
- Fuse alerts, if you switch them on.

It doesn't change your other Home Assistant settings, and you never need to edit YAML. To change anything later, tap the cog at the top right of the NomadOS screen.

## Good to know

- Works with Home Assistant 2025.1 or newer.
- The weather, rain radar and place name come from free services (Open-Meteo, RainViewer and OpenStreetMap). They need an internet connection, and you don't need an account.
- NomadOS only reads data and sends on/off commands. You are responsible for your own wiring, especially anything on 230 V, and for gas and CO safety.
