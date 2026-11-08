"""NomadOS heating mode: Off, Schedule or On."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .const import HEAT_MODE, HEAT_MODES
from .entity import HeatingEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    data = entry.runtime_data
    if data.heating:
        add([HeatingMode(data, "heating_mode", "Heating mode", HEAT_MODE, "mdi:radiator")])


class HeatingMode(HeatingEntity, SelectEntity, RestoreEntity):
    _attr_options = HEAT_MODES

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        if last and last.state in HEAT_MODES:
            self.ctl.mode = last.state

    @property
    def current_option(self) -> str:
        return self.ctl.mode

    async def async_select_option(self, option: str) -> None:
        await self.ctl.set_mode(option)
