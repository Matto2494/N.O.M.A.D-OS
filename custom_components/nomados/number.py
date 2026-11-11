"""Nomad OS heating numbers: Warm to, Keep warm temperature and the battery guard."""

from __future__ import annotations

from homeassistant.components.number import NumberMode, RestoreNumber
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import HEAT_COMFORT, HEAT_KEEP_TEMP, HEAT_MIN_SOC
from .entity import HeatingEntity

NUMBERS = [
    # key, name, entity id, controller attribute, min, max, step, unit, icon
    ("heating_warm_to", "Heating warm to", HEAT_COMFORT, "comfort", 10, 25, 0.5, UnitOfTemperature.CELSIUS, "mdi:thermometer"),
    ("heating_keep_warm_temperature", "Heating keep warm temperature", HEAT_KEEP_TEMP, "keep_temp", 5, 18, 0.5, UnitOfTemperature.CELSIUS, "mdi:thermometer-low"),
    ("heating_battery_guard", "Heating battery guard", HEAT_MIN_SOC, "min_soc", 5, 60, 5, PERCENTAGE, "mdi:battery-alert-variant-outline"),
]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    data = entry.runtime_data
    if data.heating:
        add([HeatingNumber(data, *n) for n in NUMBERS])


class HeatingNumber(HeatingEntity, RestoreNumber):
    _attr_mode = NumberMode.BOX

    def __init__(self, data, key, name, entity_id, attr, lo, hi, step, unit, icon) -> None:
        super().__init__(data, key, name, entity_id, icon)
        self._attr = attr
        self._attr_native_min_value = lo
        self._attr_native_max_value = hi
        self._attr_native_step = step
        self._attr_native_unit_of_measurement = unit

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_number_data()
        if last and last.native_value is not None:
            setattr(self.ctl, self._attr, float(last.native_value))

    @property
    def native_value(self) -> float:
        return getattr(self.ctl, self._attr)

    async def async_set_native_value(self, value: float) -> None:
        setattr(self.ctl, self._attr, float(value))
        await self.ctl.changed()
