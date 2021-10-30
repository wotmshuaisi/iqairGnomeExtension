'use strict';

imports.gi.versions.Soup = '2.4';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Soup = imports.gi.Soup;

const Notify = imports.gi.Notify;
const NONE_DROPDOWN_TEXT = "(None)";

function init() {
    Notify.init("IqairMenuButton-Settings");
}

function buildPrefsWidget() {

    // Copy the same GSettings code from `extension.js`
    let gschema = Gio.SettingsSchemaSource.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false
    );

    this.settings = new Gio.Settings({
        settings_schema: gschema.lookup('org.gnome.shell.extensions.iqair-gnome-extension', true)
    });

    // Create a parent widget that we'll return from this function
    let prefsWidget = new Gtk.Grid({
        margin_top: 18,
        margin_bottom: 18,
        margin_start: 18,
        margin_end: 18,
        column_spacing: 30,
        row_spacing: 18,
        visible: true
    });
    let session = Soup.Session.new();

    // AQI Unit
    let aqi_label = new Gtk.Label({
        label: 'AQI Unit:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(aqi_label, 0, 1, 1, 1);
    if (!this.settings.get_string('aqi')) {
        this.settings.set_string('aqi', 'US AQI');
    }
    let aqiToggle = null;
    ['US AQI', 'CN AQI'].forEach((mode, index) => {
        aqiToggle = new Gtk.ToggleButton({
            label: mode,
            group: aqiToggle,
            halign: index === 0 ? Gtk.Align.CENTER : Gtk.Align.END,
        });
        aqiToggle.set_active(this.settings.get_string('aqi') === mode);
        prefsWidget.attach(aqiToggle, 2, 1, 1, 1);
        aqiToggle.connect('toggled', button => {
            if (button.active) {
                this.settings.set_string('aqi', mode);
            }
        });
    });

    // Hide AQI Unit
    let aqi_hide_label = new Gtk.Label({
        label: 'Hide AQI unit:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(aqi_hide_label, 0, 2, 1, 1);
    if (!this.settings.get_boolean('hide-unit')) {
        this.settings.set_boolean('hide-unit', false);
    }
    let hide_unit_switch = new Gtk.Switch({ hexpand: true, halign: Gtk.Align.END });
    hide_unit_switch.set_active(this.settings.get_boolean('hide-unit'));
    hide_unit_switch.connect('state-set', () => {
        this.settings.set_boolean('hide-unit', hide_unit_switch.active);
    });
    prefsWidget.attach(hide_unit_switch, 2, 2, 1, 1);

    // IQAIR Token
    let token_label = new Gtk.Label({
        label: '',
        halign: Gtk.Align.START,
        visible: true
    });
    token_label.set_markup("IQAir Token (<span foreground='#f00'><b>required</b></span>):");
    prefsWidget.attach(token_label, 0, 3, 1, 1);
    let token_entry = new Gtk.Entry({
        text: this.settings.get_string('token'),
        halign: Gtk.Align.END,
        editable: true,
        visible: true,
        width_chars: 36,
    });
    token_entry.connect('changed', input => {
        if (input.text.length === 36) {
            this.settings.set_string('token', input.text);
        }
    });
    prefsWidget.attach(token_entry, 2, 3, 1, 1);

    // Country
    let country_label = new Gtk.Label({
        label: 'Country:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(country_label, 0, 4, 1, 1);
    let countries_dropdown = new Gtk.DropDown();
    if (this.settings.get_string('token') && this.settings.get_string('token').length == 36) {
        refreshDropDown(countries_dropdown, session, this.settings, [], 'countries', 'country');
    }
    prefsWidget.attach(countries_dropdown, 2, 4, 1, 1);


    // State
    let state_label = new Gtk.Label({
        label: 'State:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(state_label, 0, 5, 1, 1);
    let state_dropdown = new Gtk.DropDown();
    if (
        this.settings.get_string('token') &&
        this.settings.get_string('token').length == 36 &&
        this.settings.get_string('country') &&
        this.settings.get_string('country') != ''
    ) {
        refreshDropDown(state_dropdown, session, this.settings, ['country=' + settings.get_string('country')], 'states', 'state');
    }
    prefsWidget.attach(state_dropdown, 2, 5, 1, 1);

    // City
    let city_label = new Gtk.Label({
        label: 'City:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(city_label, 0, 6, 1, 1);
    let city_dropdown = new Gtk.DropDown();
    if (
        this.settings.get_string('token') &&
        this.settings.get_string('token').length == 36 &&
        this.settings.get_string('country') &&
        this.settings.get_string('country') !== '' &&
        this.settings.get_string('state') &&
        this.settings.get_string('state') !== ''
    ) {
        refreshDropDown(city_dropdown, session, this.settings, ['country=' + settings.get_string('country'), 'state=' + settings.get_string('state')], 'cities', 'city');
    }
    prefsWidget.attach(city_dropdown, 2, 6, 1, 1);
    // Position in panel
    let panel_position_label = new Gtk.Label({
        label: 'Position in panel:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(panel_position_label, 0, 7, 1, 1);
    let panel_position_combo = buildComboBox(['Left', 'Center', 'Right'], this.settings.get_string('panel-position'));
    prefsWidget.attach(panel_position_combo, 2, 7, 1, 1);
    // Link
    let token_link_button = new Gtk.LinkButton({
        label: 'Get an API token',
        uri: 'https://www.iqair.com/us/dashboard/api',
        halign: Gtk.Align.END,
    });
    prefsWidget.attach(token_link_button, 2, 8, 1, 1);
    // Save button
    let save_button = new Gtk.Button({
        label: "Save",
        halign: Gtk.Align.FILL,
    });
    save_button.get_style_context().add_class("suggested-action");
    prefsWidget.attach(save_button, 2, 9, 1, 1);

    // ComboBox events
    countries_dropdown.connect('notify::selected', () => {
        let val = countries_dropdown.get_selected_item();
        if (val) {
            city_dropdown.set_model(new Gtk.StringList([]));
        }
        if (val && val.get_string() != NONE_DROPDOWN_TEXT) {
            city_dropdown.set_model(new Gtk.StringList([]));
            refreshDropDown(state_dropdown, session, this.settings, ['country=' + val.get_string()], 'states', 'state');
        }
    });

    state_dropdown.connect('notify::selected', () => {
        let val = state_dropdown.get_selected_item();
        if (val) {
            city_dropdown.set_model(new Gtk.StringList([]));
        }
        if (val && val.get_string() != NONE_DROPDOWN_TEXT && countries_dropdown.get_selected_item() && countries_dropdown.get_selected_item().get_string() != NONE_DROPDOWN_TEXT) {
            refreshDropDown(city_dropdown, session, this.settings, ['country=' + countries_dropdown.get_selected_item().get_string(), , 'state=' + val.get_string()], 'cities', 'city');
        }
    });

    panel_position_combo.connect('changed', () => {
        this.settings.set_string('panel-position', panel_position_combo.active_id);
    });

    save_button.connect('clicked', () => {
        if (
            !countries_dropdown.get_selected_item() ||
            !state_dropdown.get_selected_item() ||
            !city_dropdown.get_selected_item() ||
            countries_dropdown.get_selected_item().get_string() == NONE_DROPDOWN_TEXT ||
            state_dropdown.get_selected_item().get_string() == NONE_DROPDOWN_TEXT ||
            city_dropdown.get_selected_item().get_string() == NONE_DROPDOWN_TEXT
        ) {
            log(['Country, State, City are not allowed to be empty.']);
            return;
        }
        try {
            this.settings.set_string('country', countries_dropdown.get_selected_item().get_string());
            this.settings.set_string('state', state_dropdown.get_selected_item().get_string());
            this.settings.set_string('city', city_dropdown.get_selected_item().get_string());
        } catch (error) {
            log([error]);
            return;
        }
        log(['Saved.']);
    });

    // Return our widget which will be added to the window
    return prefsWidget;
}

function refreshDropDown(dropdown, session, settings, params, target, inlineTarget) {
    session.queue_message(buildRequest(settings.get_string('token'), target, params), (_, response) => {
        let json_data = parseResponse(response);
        if (json_data === true) {
            return;
        }
        let model = new Gtk.StringList();
        model.append(NONE_DROPDOWN_TEXT);
        dropdown.set_model(model);
        json_data.data.forEach((item, index) => {
            if (item[inlineTarget]) {
                const val = item[inlineTarget];
                model.append(val);
                if (settings.get_string(inlineTarget) == val) {
                    dropdown.selected = index + 1;
                }
            }
        });
    });
}


function buildComboBox(options, active) {
    let comboBox = new Gtk.ComboBoxText({});
    options.forEach(val => {
        comboBox.append(val, val);
        if (active == val) {
            comboBox.set_active_id(val);
        }
    });
    return comboBox;
}

function buildRequest(token, field, arr) {
    let params = ['key=' + token,];
    arr.forEach(item => {
        params.push(item);
    })
    paramNormaliser(params);
    const url = 'https://api.airvisual.com/v2/' + field + '?' + encodeURI(params.join('&'));
    let request = Soup.Message.new('GET', url);
    request.request_headers.append('Cache-Control', 'no-cache');
    request.request_headers.append('User-Agent', 'Mozilla/5.0 (Windows NT 6.3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.84 Safari/537.36');
    log(['Built request', url], false);
    return request;
}

function parseResponse(response) {
    if (response.status_code > 299) {
        log(['Remote server error:', response.status_code, response.response_body.data]);
        return true;
    }
    const json_data = JSON.parse(response.response_body.data);
    if (!json_data.status || json_data.status !== 'success' || !json_data.data) {
        log(['Remote server error:', response.response_body.data]);
        return true;
    }
    return json_data;
}

function log(logs, notification = true) {
    print('[IqairMenuButton-Settings]', logs.join(', '));
    if (notification) {
        new Notify.Notification({
            summary: "IqairMenuButton-Settings",
            body: logs.join(', '),
            "icon-name": "dialog-information"
        }).show();
    }
}

function paramNormaliser(params) {
    for (let index = 0; index < params.length; index++) {
        let keyValue = params[index].split('=');
        if (keyValue.length === 2) {
            keyValue[1] = keyValue[1].replace(/[^\w]+/gi, '-');
            params[index] = keyValue[0] + '=' + keyValue[1];
        }
    }
}