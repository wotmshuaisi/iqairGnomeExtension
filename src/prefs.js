import Gio from "gi://Gio";
import Adw from "gi://Adw";

import Gtk from "gi://Gtk?version=4.0";

import { ExtensionPreferences, gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class IQAirPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    this._settings = this.getSettings();
    // Create a preferences page, with a single group
    const page = new Adw.PreferencesPage({
      title: _("IQAir Gnome Extension - Settings"),
      icon_name: "dialog-information-symbolic",
    });
    window.add(page);
    this._page = page;

    // Token
    page.add(this._create_token_options());

    // Country
    page.add(this._create_country_options());

    // State
    page.add(this._create_state_options());

    // City
    page.add(this._create_city_options());

    // Station
    page.add(this._create_station_options());

    // AQI
    page.add(this._create_aqi_unit_options());

    // Refresh interval
    page.add(this._create_refresh_interval_options());

    // Panel position
    page.add(this._create_panel_position_options());
  }

  _create_token_options() {
    const tokenGroup = new Adw.PreferencesGroup({ title: "IQAir Token" });

    const tokenRow = new Adw.EntryRow({
      title: "Token",
      tooltip_text: "Visit https://www.iqair.com/air-quality-monitors/api for more information.",
      show_apply_button: true,
    });

    this._settings.bind("token", tokenRow, "text", Gio.SettingsBindFlags.DEFAULT);
    // this._settings.set_string("token", "www.rrr.com");
    // tokenRow.connect("apply", (e, v) =_create_station_options
    //   this._settings.set_string("token", e.get_text());
    // });

    tokenGroup.add(tokenRow);
    return tokenGroup;
  }

  _create_country_options() {
    const countryGroup = new Adw.PreferencesGroup({ title: "Country" });

    const countryRow = new Adw.EntryRow({
      title: "Country",
      tooltip_text: "Visit https://www.iqair.com/ for more information.",
      show_apply_button: true,
    });

    this._settings.bind("country", countryRow, "text", Gio.SettingsBindFlags.DEFAULT);

    countryGroup.add(countryRow);
    return countryGroup;
  }

  _create_state_options() {
    const stateGroup = new Adw.PreferencesGroup({ title: "State" });

    const stateRow = new Adw.EntryRow({
      title: "State",
      tooltip_text: "Visit https://www.iqair.com/ for more information.",
      show_apply_button: true,
    });

    this._settings.bind("state", stateRow, "text", Gio.SettingsBindFlags.DEFAULT);

    stateGroup.add(stateRow);
    return stateGroup;
  }

  _create_city_options() {
    const cityGroup = new Adw.PreferencesGroup({ title: "City" });

    const cityRow = new Adw.EntryRow({
      title: "City",
      tooltip_text: "Visit https://www.iqair.com/ for more information.",
      show_apply_button: true,
    });

    this._settings.bind("city", cityRow, "text", Gio.SettingsBindFlags.DEFAULT);

    cityGroup.add(cityRow);
    return cityGroup;
  }

  _create_station_options() {
    const stationGroup = new Adw.PreferencesGroup({ title: "Station" });

    const stationRow = new Adw.EntryRow({
      title: "Station",
      tooltip_text: "Visit https://www.iqair.com/ for more information.",
      show_apply_button: true,
    });

    this._settings.bind("station", stationRow, "text", Gio.SettingsBindFlags.DEFAULT);

    stationGroup.add(stationRow);
    return stationGroup;
  }

  _create_refresh_interval_options() {
    const refreshGroup = new Adw.PreferencesGroup({ title: "Refresh Interval" });

    const refreshRow = new Adw.SpinRow({
      title: "Refresh Interval (Minutes)",
      subtitle: "Set how often to refresh the AQI.",
      adjustment: new Gtk.Adjustment({
        lower: 1,
        upper: 120,
        step_increment: 1,
      }),
    });
    this._settings.bind("refresh-interval", refreshRow, "value", Gio.SettingsBindFlags.DEFAULT);

    refreshGroup.add(refreshRow);
    return refreshGroup;
  }

  _create_aqi_unit_options() {
    const aqiGroup = new Adw.PreferencesGroup({ title: "AQI Unit" });

    const aqiModel = new Gtk.StringList();
    ["US AQI", "CN AQI"].forEach((pos) => aqiModel.append(pos));

    const aqiRow = new Adw.ComboRow({
      title: "AQI Unit",
      subtitle: "Select the aqi unit of the indicator on the panel.",
      model: aqiModel,
    });
    this._settings.bind("aqi", aqiRow, "selected", Gio.SettingsBindFlags.NO_SENSETIVITY);

    aqiGroup.add(aqiRow);
    return aqiGroup;
  }

  _create_panel_position_options() {
    const positionGroup = new Adw.PreferencesGroup({ title: "Panel Position" });

    const positionModel = new Gtk.StringList();
    ["Left", "Center", "Right"].forEach((pos) => positionModel.append(pos));

    const positionRow = new Adw.ComboRow({
      title: "Panel Position",
      subtitle: "Select the position of the indicator on the panel.",
      model: positionModel,
    });
    this._settings.bind("panel-position", positionRow, "selected", Gio.SettingsBindFlags.NO_SENSETIVITY);

    positionGroup.add(positionRow);
    return positionGroup;
  }
}
