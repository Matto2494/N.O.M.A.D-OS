"""Nomad OS fuse checks. Each fuse is a 'problem' sensor: on means blown.

Two ways of checking:
- Victron check: a Victron device (inverter, solar charger, DC-DC charger) measures
  the battery voltage itself. If it stops reporting, or sees a very different
  voltage from the battery monitor for 3 minutes, its fuse or cable has gone.
- Sense wire: a thin wire from the output side of the fuse goes to a sensor box
  (an ESP32 with an optocoupler board). No power on the wire while the battery is
  fine means the fuse has blown.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from homeassistant.components import persistent_notification
from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_call_later, async_track_state_change_event
from homeassistant.util import slugify
from homeassistant.util import dt as dt_util

from .entity import NomadEntity

VICTRON_DELAY = timedelta(minutes=3)
SENSE_DELAY = timedelta(seconds=20)
MAX_GAP_V = 1.5
BATTERY_OK_V = 11.0  # below this the whole system is struggling, so don't blame a fuse


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    data = entry.runtime_data
    if not data.features.get("fuses"):
        return
    ents = []
    for i, f in enumerate(data.config.get("fuses") or []):
        if not f.get("entity") or not f.get("label"):
            continue
        fid = f.get("id") or slugify(f["label"])
        ents.append(Fuse(data, f, fid, i))
    add(ents)


def _num(hass: HomeAssistant, eid: str | None) -> float | None:
    st = hass.states.get(eid) if eid else None
    if st is None or st.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
        return None
    try:
        return float(st.state)
    except ValueError:
        return None


class Fuse(NomadEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, data, f: dict, fid: str, order: int) -> None:
        super().__init__(data, f"fuse_{fid}", f"Fuse {f['label']}", f"binary_sensor.nomados_fuse_{fid}", "mdi:fuse")
        self.f = f
        self.order = order
        self.victron = f.get("check") == "victron"
        self.delay = VICTRON_DELAY if self.victron else SENSE_DELAY
        self._bad_since = None
        self._timer = None
        self._attr_is_on = None
        self._detail = ""

    @property
    def batt(self) -> str | None:
        return self.data.entity("batt_voltage")

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        watch = [e for e in (self.f["entity"], self.batt, self.f.get("skip_when_off")) if e]
        self.async_on_remove(async_track_state_change_event(self.hass, watch, self._changed))
        self.async_on_remove(self._cancel)
        self._check()

    @callback
    def _cancel(self) -> None:
        if self._timer:
            self._timer()
            self._timer = None

    @callback
    def _changed(self, event: Event) -> None:
        self._check()

    @callback
    def _check(self, _now=None) -> None:
        hass, f = self.hass, self.f
        self._timer = None
        st = hass.states.get(f["entity"])
        bat = _num(hass, self.batt)
        available = True
        bad = False
        if self.victron:
            v = _num(hass, f["entity"])
            skip = f.get("skip_when_off")
            if st is None or (bat is None and self.batt):
                available = False
                self._detail = "Device not found in Home Assistant" if st is None else "No battery voltage to compare with"
            elif skip and hass.states.is_state(skip, STATE_OFF):
                self._detail = "Not checked while it's switched off"
            elif v is None:
                bad = bat is None or bat > BATTERY_OK_V
                self._detail = "It has stopped reporting"
            else:
                bad = bat is not None and bat > BATTERY_OK_V and abs(v - bat) > MAX_GAP_V
                self._detail = f"It sees {v:.1f} V, battery {bat:.1f} V" if bat is not None else f"It sees {v:.1f} V"
        else:
            if st is None or st.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                available = False
                self._detail = "Fit the fuse sensor box"
            else:
                bad = st.state == STATE_OFF and (bat is None or bat > BATTERY_OK_V)
                self._detail = "No power after the fuse" if bad else "Power after the fuse"

        self._attr_available = available
        was = self._attr_is_on
        if not available:
            self._bad_since = None
            self._attr_is_on = None
        elif not bad:
            self._bad_since = None
            self._attr_is_on = False
        else:
            now = dt_util.utcnow()
            self._bad_since = self._bad_since or now
            if now - self._bad_since >= self.delay:
                self._attr_is_on = True
            else:
                if was is None:
                    self._attr_is_on = False
                self._cancel()
                left = (self._bad_since + self.delay - now).total_seconds() + 1
                self._timer = async_call_later(hass, left, self._check)
        if self._attr_is_on and not was:
            persistent_notification.async_create(
                hass,
                f"The {f['label']} fuse looks blown. {self._detail}.",
                title="Fuse blown",
                notification_id=f"nomados_fuse_{self.unique_id}",
            )
        elif was and not self._attr_is_on:
            persistent_notification.async_dismiss(hass, f"nomados_fuse_{self.unique_id}")
        self.async_write_ha_state()

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        f = self.f
        return {
            "label": f["label"],
            "fuse_group": f.get("group") or ("Main fuses" if self.victron else "Fuse box"),
            "fuse_style": f.get("style") or ("mega" if self.victron else "blade"),
            "rating": f.get("rating") or "",
            "order": self.order + 1,
            "check": "Victron" if self.victron else "Sense wire",
            "detail": self._detail,
            "checked_with": f["entity"],
        }
