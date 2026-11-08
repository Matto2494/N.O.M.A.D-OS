"""Constants for NomadOS."""

DOMAIN = "nomados"
VERSION = "2.1.0"

PANEL_URL = "nomados"
PANEL_TITLE = "NomadOS"
PANEL_ICON = "mdi:van-utility"
PANEL_ELEMENT = "nomados-panel"

STATIC_URL = "/nomados_static"  # the dashboard code, shipped inside this folder
FILES_URL = "/nomados_files"  # the owner's own files (van photo), kept in /config/nomados

STORE_KEY = "nomados.config"
STORE_VERSION = 1

# Entities NomadOS makes for itself. The dashboard is told these ids.
NIGHT = "switch.nomados_night_mode"
HEAT_MODE = "select.nomados_heating_mode"
HEAT_COMFORT = "number.nomados_heating_warm_to"
HEAT_KEEP_TEMP = "number.nomados_heating_keep_warm_temperature"
HEAT_MIN_SOC = "number.nomados_heating_battery_guard"
HEAT_KEEP = "switch.nomados_heating_keep_warm"
HEAT_BOOST = "switch.nomados_heating_boost"
THERMOSTAT = "climate.nomados_heater"
HEAT_SCHEDULE = "schedule.nomados_heating"  # made by the Heating page the first time times are saved

HEAT_MODES = ["Off", "Schedule", "On"]
BOOST_MINUTES = 60
MIN_RUN_MINUTES = 20  # diesel heaters soot up on short runs
COLD_TOLERANCE = 0.7
HOT_TOLERANCE = 0.5

SIGNAL_HEATING = "nomados_heating_changed"
