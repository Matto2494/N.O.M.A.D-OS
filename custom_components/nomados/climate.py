"""The heater as a thermostat, so it also works from the Home Assistant app and voice assistants."""

from __future__ import annotations

from typing import Any

from homeassistant.components.climate import ClimateEntity, ClimateEntityFeature, HVACAction, HVACMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import THERMOSTAT
from .entity import HeatingEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    data = entry.runtime_data
    if data.heating:
        add([Heater(data, "heater", "Heater", THERMOSTAT, "mdi:radiator")])


class Heater(HeatingEntity, ClimateEntity):
    _attr_hvac_modes = [HVACMode.OFF, HVACMode.HEAT]
    _attr_supported_features = ClimateEntityFeature.TARGET_TEMPERATURE | ClimateEntityFeature.TURN_ON | ClimateEntityFeature.TURN_OFF
    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_target_temperature_step = 0.5
    _attr_min_temp = 5
    _attr_max_temp = 25

    @property
    def hvac_mode(self) -> HVACMode:
        return HVACMode.HEAT if self.ctl.want in ("comfort", "keep") else HVACMode.OFF

    @property
    def hvac_action(self) -> HVACAction:
        if self.ctl.want in ("off", "paused"):
            return HVACAction.OFF
        return HVACAction.HEATING if self.ctl.heater_on else HVACAction.IDLE

    @property
    def current_temperature(self) -> float | None:
        return self.ctl.current_temp

    @property
    def target_temperature(self) -> float | None:
        return self.ctl.target if self.ctl.target is not None else self.ctl.comfort

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"heating_mode": self.ctl.mode, "reason": self.ctl.want, "boost_minutes_left": self.ctl.boost_left}

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        await self.ctl.set_mode("On" if hvac_mode == HVACMode.HEAT else "Off")

    async def async_turn_on(self) -> None:
        await self.ctl.set_mode("On")

    async def async_turn_off(self) -> None:
        await self.ctl.set_mode("Off")

    async def async_set_temperature(self, **kwargs: Any) -> None:
        if (t := kwargs.get(ATTR_TEMPERATURE)) is not None:
            if self.ctl.want == "keep":
                self.ctl.keep_temp = float(t)
            else:
                self.ctl.comfort = float(t)
            await self.ctl.changed()
