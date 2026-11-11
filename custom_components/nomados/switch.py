"""Nomad OS switches: Night (dims the screen), and the heating Keep warm and Boost."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.util import dt as dt_util

from .const import HEAT_BOOST, HEAT_KEEP, NIGHT
from .entity import HeatingEntity, NomadEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    data = entry.runtime_data
    ents: list = [NightSwitch(data, "night_mode", "Night mode", NIGHT, "mdi:weather-night")]
    if data.heating:
        ents += [
            KeepWarmSwitch(data, "heating_keep_warm", "Heating keep warm", HEAT_KEEP, "mdi:snowflake-thermometer"),
            BoostSwitch(data, "heating_boost", "Heating boost", HEAT_BOOST, "mdi:fire"),
        ]
    add(ents)


class NightSwitch(NomadEntity, SwitchEntity, RestoreEntity):
    _attr_is_on = False

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        self._attr_is_on = bool(last and last.state == STATE_ON)

    async def async_turn_on(self, **kwargs: Any) -> None:
        self._attr_is_on = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        self._attr_is_on = False
        self.async_write_ha_state()


class KeepWarmSwitch(HeatingEntity, SwitchEntity, RestoreEntity):
    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        if last:
            self.ctl.keep_on = last.state == STATE_ON

    @property
    def is_on(self) -> bool:
        return self.ctl.keep_on

    async def async_turn_on(self, **kwargs: Any) -> None:
        self.ctl.keep_on = True
        await self.ctl.changed()

    async def async_turn_off(self, **kwargs: Any) -> None:
        self.ctl.keep_on = False
        await self.ctl.changed()


class BoostSwitch(HeatingEntity, SwitchEntity, RestoreEntity):
    """An hour of heat in any mode. Turns itself off when the hour is up."""

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        if last and last.state == STATE_ON and last.attributes.get("finishes_at"):
            until = dt_util.parse_datetime(last.attributes["finishes_at"])
            if until and until > dt_util.utcnow():
                self.ctl.boost_until = until

    @property
    def is_on(self) -> bool:
        return self.ctl.boost_left is not None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        until: datetime | None = self.ctl.boost_until
        return {"finishes_at": until.isoformat() if until and self.is_on else None, "minutes_left": self.ctl.boost_left}

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.ctl.set_boost(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.ctl.set_boost(False)
