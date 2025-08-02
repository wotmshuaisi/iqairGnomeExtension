import GObject from "gi://GObject";
import St from "gi://St";
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Soup from "gi://Soup";

import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Util from "resource:///org/gnome/shell/misc/util.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    displayText = "...";

    _get_setting_val(key) {
      return this._ext._settings.get_value(key).unpack();
    }

    _init(ext) {
      super._init(0.0, _("IQAir Gnome Extension"));
      this._ext = ext;
      this._httpSession = new Soup.Session();
      this.api_url = `https://api.airvisual.com/v2/${this._get_setting_val("station") === "" ? "station" : "city"}`;
      this.lock = false;
      this.quality;
      this.quality_unit;
      this.quality_icon;
      this.lastUpdate;
      this.country = this._get_setting_val("country");
      this.state = this._get_setting_val("state");
      this.city = this._get_setting_val("city");
      this.station = this._get_setting_val("station");
      this.aqi = this._get_setting_val("aqi");

      // Components
      let box = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      this.quality_icon = new St.Icon({
        icon_name: "content-loading-symbolic",
        style_class: "system-status-icon",
        y_align: Clutter.ActorAlign.CENTER,
      });
      this.quality = new St.Label({
        text: "...",
        y_align: Clutter.ActorAlign.CENTER,
      });
      this.quality_unit = new PopupMenu.PopupMenuItem(_(`Unit: ${this.aqi === 0 ? "US AQI" : "CN AQI"}`));
      this.lastUpdate = new PopupMenu.PopupMenuItem(_(`Last update: ...`));
      let refreshBtn = new PopupMenu.PopupMenuItem(_(`Refresh`));
      let settingsBtn = new PopupMenu.PopupMenuItem(_(`Settings`));
      // Events
      refreshBtn.connect("activate", () => {
        this._fetch_data();
      });
      settingsBtn.connect("activate", () => {
        this._ext.openPreferences();
      });
      this.quality_unit.connect("activate", () => {
        Gio.AppInfo.launch_default_for_uri(`https://www.iqair.com/${this.country}/${this.state}/${this.city}${this.station ? "/" + this.station : ""}`.toLowerCase(), null);
      });
      this.lastUpdate.connect("activate", () => {
        Gio.AppInfo.launch_default_for_uri(`https://www.iqair.com/${this.country}/${this.state}/${this.city}${this.station ? "/" + this.station : ""}`.toLowerCase(), null);
      });
      // Display
      this.menu.addMenuItem(this.quality_unit);
      this.menu.addMenuItem(this.lastUpdate);
      this.menu.addMenuItem(refreshBtn);
      this.menu.addMenuItem(settingsBtn);
      box.add_child(this.quality_icon);
      box.add_child(this.quality);
      this.add_child(box);
      // Event loop
      this._fetch_data();
      this.backgroundTask = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._get_refresh_interval() * 60, () => {
        this._fetch_data();
        return GLib.SOURCE_CONTINUE;
      });
    }

    _get_refresh_interval() {
      return this._get_setting_val("refresh-interval");
    }

    _build_req() {
      let params = ["city=" + this.city, "state=" + this.state, "country=" + this.country, "key=" + this._get_setting_val("token")];
      if (this.station !== "") {
        params.push("station=" + this.station);
      }
      const url = `${this.api_url}?${params.join("&")}`;
      let request = Soup.Message.new("GET", url);
      request.request_headers.append("Cache-Control", "no-cache");

      this._log([url]); // debug
      return request;
    }

    _fetch_data() {
      if (this.lock) {
        return;
      }
      this.lock = true;
      let msg = this._build_req();
      this._httpSession.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (_, response) => {
        response = new TextDecoder("utf-8").decode(this._httpSession.send_and_read_finish(response).get_data());

        if (msg.get_status() > 299) {
          this._log(["Remote server error:", msg.get_status(), response]);
          return;
        }

        const json_data = JSON.parse(response);
        if (!json_data.status || json_data.status !== "success" || !json_data.data.current || !json_data.data.current.pollution) {
          this._log(["Remote server error:", response]);
          return;
        }

        let json_aqi = 0;
        if (this.aqi === 1) {
          json_aqi = json_data.data.current.pollution.aqicn;
        } else {
          json_aqi = json_data.data.current.pollution.aqius;
        }

        switch (true) {
          case json_aqi < 51:
            // Good
            this.quality_icon.icon_name = "face-smile-symbolic";
            break;
          case json_aqi < 101:
            // Moderate
            this.quality_icon.icon_name = "face-plain-symbolic";
            break;
          case json_aqi < 151:
            // Unhealthy for sensitive groups
            this.quality_icon.icon_name = "face-sad-symbolic";
            break;
          case json_aqi < 201:
            // Unhealthy
            this.quality_icon.icon_name = "face-worried-symbolic";
            break;
          case json_aqi < 301:
            // Very unhealthy
            this.quality_icon.icon_name = "face-yawn-symbolic";
            break;
          default:
            // Hazardous
            this.quality_icon.icon_name = "face-sick-symbolic";
            break;
        }

        this._log([`Update AQI from: ${this.quality.text} to ${json_aqi}`]);

        this.quality.text = json_aqi.toString();
        this.quality_unit.label_actor.text = `Unit: ${this.aqi === 0 ? "US AQI" : "CN AQI"}`;
        this.lastUpdate.label_actor.text = "Last update: " + _get_last_update_time(this._get_setting_val("last-update-format"));
      });
      this.lock = false;
    }

    _get_last_update_time(format) {
      let configs = { hour: "numeric", minute: "numeric", second: "numeric", hour12: false };
      if (format === "12H") {
        configs.hour12 = true;
        return new Date().toLocaleString("en", configs);
      }
      return new Date().toLocaleString("en", configs);
    }

    _log(logs) {
      console.warn("[IQAirMonitor]", logs.join(", "));
      // Main.notifyError("IQAirMonitor", logs.join(", "));
    }

    destroy() {
      // Remove the background taks
      GLib.source_remove(this.backgroundTask);
      super.destroy();
    }
  }
);

export default class GoldPriceIndicatorExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._indicator = new Indicator(this);
    this.addToPanel(this._settings.get_value("panel-position").unpack());

    ["country", "state", "city", "station", "token", "aqi", "refresh-interval", "panel-position"].forEach((key) => {
      this._settings.connect(`changed::${key}`, () => {
        this.disable();
        this.enable();
      });
    });
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
    this._settings = null;
  }

  addToPanel(indicator_position) {
    switch (indicator_position) {
      case 0:
        Main.panel.addToStatusArea(this.uuid, this._indicator, Main.panel._leftBox.get_children().length, "left");
        break;
      case 1:
        Main.panel.addToStatusArea(this.uuid, this._indicator, Main.panel._centerBox.get_children().length, "center");
        break;
      case 2:
        Main.panel.addToStatusArea(this.uuid, this._indicator);
        break;
    }
  }
}
