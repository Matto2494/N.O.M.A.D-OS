"""Shared bits for Nomad OS's own entities."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity

from .const import DOMAIN, SIGNAL_HEATING, VERSION


class NomadEntity(Entity):
    """An entity owned by Nomad OS, grouped under one Nomad OS device."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, data, key: str, name: str, entity_id: str, icon: str | None = None) -> None:
        self.data = data
        self._attr_unique_id = f"nomados_{key}"
        self._attr_name = name
        if icon:
            self._attr_icon = icon
        # Ask for a fixed, readable id. If the owner renames it later the dashboard still finds it.
        self.entity_id = entity_id
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, "nomados")},
            name="Nomad OS",
            manufacturer="Nomad OS",
            model="Van command centre",
            sw_version=VERSION,
        )


class HeatingEntity(NomadEntity):
    """A heating control: refreshes whenever the controller decides something."""

    @property
    def ctl(self):
        return self.data.heating

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_HEATING, self.async_write_ha_state))
