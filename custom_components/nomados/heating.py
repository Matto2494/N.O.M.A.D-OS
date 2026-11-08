"""The heating controller.

In plain words: it decides whether the heater should be on, from the mode
(Off / Schedule / On), the weekly heating times, Boost, Keep warm and the
battery guard. With an inside temperature sensor it holds a temperature;
without one it just runs the heater during the heating times.

Diesel heaters soot up if they're started and stopped a lot, so once the
heater starts it runs for at least 20 minutes, and it only starts again
when it's 0.7 degrees below the target.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import logging
from typing import TYPE_CHECKING

from homeassistant.components import persistent_notification
from homeassistant.const import STATE_ON, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import (
    BOOST_MINUTES,
    COLD_TOLERANCE,
    HEAT_SCHEDULE,
    HOT_TOLERANCE,
    MIN_RUN_MINUTES,
    SIGNAL_HEATING,
)

if TYPE_CHECKING:
    from . import NomadData

_LOGGER = logging.getLogger(__name__)
LOW_BATT_NOTE = "nomados_heating_low_battery"


def _num(hass: HomeAssistant, entity_id: str | None) -> float | None:
    if not entity_id:
        return None
    st = hass.states.get(entity_id)
    if st is None or st.state in (STATE_UNAVAILABLE, STATE_UNKNOWN, ""):
        return None
    try:
        return float(st.state)
    except ValueError:
        return None


class HeatingController:
    def __init__(self, hass: HomeAssistant, data: NomadData) -> None:
        self.hass = hass
        self.data = data
        # Settings (restored by their entities when Home Assistant starts)
        self.mode = "Off"
        self.comfort = 19.0
        self.keep_temp = 10.0
        self.min_soc = 20.0
        self.keep_on = False
        self.boost_until: datetime | None = None
        # What it worked out last time
        self.want = "off"
        self.target: float | None = None
        self.heater_on = False
        self.last_switch: datetime | None = None
        self._unsubs: list = []

    # --- the entities the owner picked ---
    @property
    def heater(self) -> str | None:
        return self.data.entity("sw_heater")

    @property
    def sensor(self) -> str | None:
        return self.data.entity("cabin_temp")

    @property
    def soc_entity(self) -> str | None:
        return self.data.entity("soc")

    @property
    def schedule(self) -> str:
        return self.data.entity("heat_schedule") or HEAT_SCHEDULE

    @property
    def boost_left(self) -> int | None:
        if not self.boost_until:
            return None
        left = (self.boost_until - dt_util.utcnow()).total_seconds()
        return max(1, int(left // 60) + 1) if left > 0 else None

    @property
    def current_temp(self) -> float | None:
        return _num(self.hass, self.sensor)

    # --- start / stop ---
    @callback
    def start(self) -> None:
        watch = [e for e in (self.heater, self.sensor, self.soc_entity, self.schedule) if e]
        self._unsubs.append(async_track_state_change_event(self.hass, watch, self._on_state))
        self._unsubs.append(async_track_time_interval(self.hass, self._on_tick, timedelta(seconds=60)))
        self.hass.async_create_task(self.evaluate("start"))

    @callback
    def stop(self) -> None:
        for u in self._unsubs:
            u()
        self._unsubs.clear()

    @callback
    def _on_state(self, event: Event) -> None:
        self.hass.async_create_task(self.evaluate("state"))

    async def _on_tick(self, _now) -> None:
        await self.evaluate("tick")

    # --- changes from the dashboard ---
    async def set_mode(self, mode: str) -> None:
        self.mode = mode
        if mode == "Off":
            self.boost_until = None
        await self.evaluate("mode")

    async def set_boost(self, on: bool) -> None:
        self.boost_until = dt_util.utcnow() + timedelta(minutes=BOOST_MINUTES) if on else None
        await self.evaluate("boost")

    async def changed(self) -> None:
        await self.evaluate("setting")

    # --- the decision ---
    async def evaluate(self, why: str) -> None:
        hass = self.hass
        if self.boost_until and dt_util.utcnow() >= self.boost_until:
            self.boost_until = None
        sched_on = hass.states.is_state(self.schedule, STATE_ON)
        boost = self.boost_until is not None
        if boost or self.mode == "On" or (self.mode == "Schedule" and sched_on):
            want = "comfort"
        elif self.mode == "Schedule" and self.keep_on:
            want = "keep"
        else:
            want = "off"
        soc = _num(hass, self.soc_entity)
        low_batt = soc is not None and soc < self.min_soc
        temp = self.current_temp
        target = self.comfort if want == "comfort" else self.keep_temp if want == "keep" else None

        heater_state = hass.states.get(self.heater) if self.heater else None
        is_on = heater_state is not None and heater_state.state == STATE_ON
        now = dt_util.utcnow()
        ran_long_enough = self.last_switch is None or now - self.last_switch >= timedelta(minutes=MIN_RUN_MINUTES)

        if want == "off" or low_batt:
            turn_on = False
        elif temp is None:
            # No inside sensor: run by the clock only (Keep warm needs the sensor)
            turn_on = want == "comfort"
        elif is_on:
            turn_on = not (temp >= target + HOT_TOLERANCE and ran_long_enough)
        else:
            turn_on = temp <= target - COLD_TOLERANCE

        self.want = "paused" if (low_batt and want != "off") else want
        self.target = target

        if low_batt and want != "off":
            persistent_notification.async_create(
                hass,
                f"The house battery is at {round(soc)}%, below the {round(self.min_soc)}% you set, so the heater won't start.",
                title="Heating paused",
                notification_id=LOW_BATT_NOTE,
            )
        else:
            persistent_notification.async_dismiss(hass, LOW_BATT_NOTE)

        if self.heater and heater_state is not None and turn_on != is_on:
            self.last_switch = now
            await hass.services.async_call(
                "homeassistant", "turn_on" if turn_on else "turn_off", {"entity_id": self.heater}, blocking=False
            )
        self.heater_on = turn_on
        async_dispatcher_send(hass, SIGNAL_HEATING)
