"""NomadOS: a full-screen campervan command centre for Home Assistant.

What this integration does, so the owner never touches YAML:
- adds the NomadOS page to the sidebar and serves its code,
- keeps the answers from the setup wizard (stored in /config/.storage/nomados.config),
- makes the helpers the dashboard needs (night switch, heating controls),
- runs the heating controller and the fuse checks itself.
"""

from __future__ import annotations

import base64
import binascii
import logging
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.components import frontend, panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store

from .heating import HeatingController
from . import binary_sensor, climate, number, select, switch  # noqa: F401  (loaded now, not inside the event loop)
from .const import (
    DOMAIN,
    FILES_URL,
    PANEL_ELEMENT,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL,
    STATIC_URL,
    STORE_KEY,
    STORE_VERSION,
    VERSION,
)

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.SWITCH, Platform.SELECT, Platform.NUMBER, Platform.CLIMATE, Platform.BINARY_SENSOR]
MAX_PHOTO_BYTES = 6 * 1024 * 1024
MAX_PRO_BYTES = 2 * 1024 * 1024
PRO_MARK = "/*NOMADOS-PRO "
PRO_FEATURES = ("heating", "fuses", "level", "trips")


def _pro_info(hass: HomeAssistant) -> dict[str, Any] | None:
    """Is NomadOS Pro added? (Runs in the executor: it reads a file.)"""
    path = Path(hass.config.path("nomados", "pro", "nomados-pro.js"))
    if not path.is_file():
        return None
    with path.open(encoding="utf-8") as fh:
        head = fh.read(64)
    if not head.startswith(PRO_MARK):
        return None
    version = head[len(PRO_MARK):].split("*/", 1)[0].strip()
    return {"version": version, "url": f"{FILES_URL}/pro/nomados-pro.js?v={int(path.stat().st_mtime)}"}


class NomadData:
    """Everything NomadOS keeps while running."""

    def __init__(self, hass: HomeAssistant, store: Store, config: dict[str, Any]) -> None:
        self.hass = hass
        self.store = store
        self.config = config
        self.heating = None  # set up by climate.py when heating is switched on
        self.pro: dict[str, Any] | None = None

    @property
    def features(self) -> dict[str, bool]:
        f = dict(self.config.get("features") or {})
        if not self.pro:  # heating, fuses, level and trips are Pro
            for k in PRO_FEATURES:
                f[k] = False
        return f

    def entity(self, key: str) -> str | None:
        """An entity the owner picked in the wizard (or None)."""
        return (self.config.get("entities") or {}).get(key) or None


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register the websocket commands once per Home Assistant start."""
    websocket_api.async_register_command(hass, ws_get_config)
    websocket_api.async_register_command(hass, ws_save_config)
    websocket_api.async_register_command(hass, ws_save_photo)
    websocket_api.async_register_command(hass, ws_install_pro)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    store = Store(hass, STORE_VERSION, STORE_KEY)
    stored = await store.async_load() or {}
    data = NomadData(hass, store, stored)
    entry.runtime_data = data
    hass.data[DOMAIN] = data

    files_dir = Path(hass.config.path("nomados"))
    await hass.async_add_executor_job(lambda: files_dir.mkdir(exist_ok=True))
    data.pro = await hass.async_add_executor_job(_pro_info, hass)

    if not hass.data.get(f"{DOMAIN}_static"):
        hass.data[f"{DOMAIN}_static"] = True
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(STATIC_URL, str(Path(__file__).parent / "frontend"), False),
                StaticPathConfig(FILES_URL, str(files_dir), False),
            ]
        )

    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name=PANEL_ELEMENT,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=f"{STATIC_URL}/nomados.js?v={VERSION}",
        config={"mode": "live", "nomados": True},
        require_admin=False,
    )

    if data.features.get("heating") and data.entity("sw_heater"):
        data.heating = HeatingController(hass, data)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    if data.heating:
        data.heating.start()
        entry.async_on_unload(data.heating.stop)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    frontend.async_remove_panel(hass, PANEL_URL)
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        hass.data.pop(DOMAIN, None)
    return ok


def _own_entities(hass: HomeAssistant) -> dict[str, str]:
    """Map NomadOS's own entities (by unique id) to their current entity ids.

    The owner can rename an entity in Home Assistant; the dashboard still finds it.
    """
    reg = er.async_get(hass)
    out: dict[str, str] = {}
    for ent in reg.entities.values():
        if ent.platform == DOMAIN and ent.unique_id.startswith("nomados_"):
            out[ent.unique_id.removeprefix("nomados_")] = ent.entity_id
    return out


@websocket_api.websocket_command({vol.Required("type"): "nomados/config"})
@callback
def ws_get_config(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    data: NomadData | None = hass.data.get(DOMAIN)
    if data is None:
        connection.send_error(msg["id"], "not_loaded", "NomadOS is not set up")
        return
    connection.send_result(
        msg["id"],
        {
            "version": VERSION,
            "config": data.config,
            "own": _own_entities(hass),
            "pro": data.pro,
            "is_admin": connection.user.is_admin,
        },
    )


@websocket_api.websocket_command(
    {vol.Required("type"): "nomados/config/save", vol.Required("config"): dict}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_config(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    data: NomadData | None = hass.data.get(DOMAIN)
    if data is None:
        connection.send_error(msg["id"], "not_loaded", "NomadOS is not set up")
        return
    new = dict(msg["config"])
    new["saved_with"] = VERSION
    await data.store.async_save(new)
    entries = hass.config_entries.async_entries(DOMAIN)
    # Reload so NomadOS adds or removes its own helpers to match the features chosen
    if entries:
        hass.async_create_task(hass.config_entries.async_reload(entries[0].entry_id))
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "nomados/photo",
        vol.Required("data"): str,
        vol.Optional("ext", default="webp"): vol.In(["webp", "png", "jpg"]),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_photo(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    raw = msg["data"].split(",", 1)[-1]
    try:
        blob = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError):
        connection.send_error(msg["id"], "bad_image", "That picture couldn't be read")
        return
    if len(blob) > MAX_PHOTO_BYTES:
        connection.send_error(msg["id"], "too_big", "That picture is too big")
        return
    folder = Path(hass.config.path("nomados"))

    def _write() -> str:
        folder.mkdir(exist_ok=True)
        for old in folder.glob("van-photo.*"):
            old.unlink()
        name = f"van-photo.{msg['ext']}"
        (folder / name).write_bytes(blob)
        return name

    name = await hass.async_add_executor_job(_write)
    connection.send_result(msg["id"], {"url": f"{FILES_URL}/{name}"})


@websocket_api.websocket_command({vol.Required("type"): "nomados/pro/install", vol.Required("code"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_install_pro(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Prototype: add the Pro file by hand. Later the licence key downloads it from the shop."""
    data: NomadData | None = hass.data.get(DOMAIN)
    code: str = msg["code"]
    if data is None:
        connection.send_error(msg["id"], "not_loaded", "NomadOS is not set up")
        return
    if not code.startswith(PRO_MARK) or len(code.encode()) > MAX_PRO_BYTES:
        connection.send_error(msg["id"], "not_pro", "That file isn't NomadOS Pro")
        return

    def _write() -> dict[str, Any] | None:
        folder = Path(hass.config.path("nomados", "pro"))
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "nomados-pro.js").write_text(code, encoding="utf-8")
        return _pro_info(hass)

    data.pro = await hass.async_add_executor_job(_write)
    connection.send_result(msg["id"], data.pro)
