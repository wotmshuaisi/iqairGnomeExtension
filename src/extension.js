/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'my-indicator-extension';

const { GObject, St, Gtk, Clutter } = imports.gi;
const Gio = imports.gi.Gio;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Soup = imports.gi.Soup;
const Mainloop = imports.mainloop;
const MessageTray = imports.ui.messageTray;
const GLib = imports.gi.GLib;

const AQIIndicator = GObject.registerClass(
    class AQIIndicator extends PanelMenu.Button {

        _init() {
            super._init(0.0, _('IqairMenuButton'));
            this.periodic_task;
            this.lock = false;
            this.settings;
            this.quality_icon;
            this.quality_value;
            this.lastUpdate;
            this.location;
            this.menu;
            this.api_url = 'https://api.airvisual.com/v2/city';
            this._httpSession = new Soup.SessionAsync();


            let gschema = Gio.SettingsSchemaSource.new_from_directory(
                Me.dir.get_child('schemas').get_path(),
                Gio.SettingsSchemaSource.get_default(),
                false
            );
            // settings
            this.settings = new Gio.Settings({
                settings_schema: gschema.lookup('org.gnome.shell.extensions.iqair-gnome-extension', true)
            });

            // Watch the settings for changes
            // this._onPanelStatesChangedId = this.settings.connect(
            //     'changed::panel-states',
            //     this._onPanelStatesChanged.bind(this)
            // );

            // Indicator
            let box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });

            // Icon + Label
            this.quality_icon = new St.Icon({
                // icon_name: 'face-smile-symbolic',
                icon_name: 'content-loading-symbolic',
                style_class: 'system-status-icon',
            });
            this.quality_value = new St.Label({
                y_align: Clutter.ActorAlign.CENTER,
            });

            // drop-down menu
            this.location = new PopupMenu.PopupMenuItem(_(''));
            this.lastUpdate = new PopupMenu.PopupMenuItem(_('Last update:'));
            let refresh = new PopupMenu.PopupMenuItem(_('Refresh'));
            let showOnWebsite = new PopupMenu.PopupMenuItem(_('Show on website'));

            refresh.connect('activate', () => {
                this.refreshData();
            });
            showOnWebsite.connect('activate', () => {
                const url = `https://www.iqair.com/${this.settings.get_value('country').unpack().toLowerCase()}/${this.settings.get_value('state').unpack().toLowerCase()}/${this.settings.get_value('city').unpack().toLowerCase()}/`
                try {
                    Gtk.show_uri(null, url, global.get_current_time());
                } catch (error) {
                    Main.notifyError(title, 'Can not open ' + url);
                }
            });

            // set widgets
            this.menu.addMenuItem(this.location);
            this.menu.addMenuItem(this.lastUpdate);
            this.menu.addMenuItem(refresh);
            this.menu.addMenuItem(showOnWebsite);

            box.add_child(this.quality_icon);
            box.add_child(this.quality_value);
            box.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
            this.add_child(box);

            if (this.settings.get_value('token').unpack() !== '') {
                this.refreshData();
            }
        }

        buildRequest() {
            let params = ['city=' + this.settings.get_value('city').unpack(), 'state=' + this.settings.get_value('state').unpack(), 'country=' + this.settings.get_value('country').unpack(), 'key=' + this.settings.get_value('token').unpack()];
            this.paramNormaliser(params);
            const url = this.api_url + '?' + encodeURI(params.join('&'))
            let request = Soup.Message.new('GET', url);
            request.request_headers.append('Cache-Control', 'no-cache');
            request.request_headers.append('User-Agent', 'Mozilla/5.0 (Windows NT 6.3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.84 Safari/537.36');

            // this.log(false,[url]); // debug
            return request;
        }

        refreshData() {
            if (this.lock) {
                return;
            }
            this.lock = true;
            if (this.settings.get_value('token').unpack() === '') {
                Main.notify('[Iqair Gnome Extension] Token is required.', '');
                this.lock = false;
                this.purgeBackgroundTask();
                this.periodic_task = Mainloop.timeout_add_seconds(2700, () => { this.refreshData() });
                return;
            }
            this._httpSession.queue_message(this.buildRequest(), (_, response) => {
                if (response.status_code > 299) {
                    this.log(true, ['Remote server error:', response.status_code, response.response_body.data]);
                    return;
                }
                const json_data = JSON.parse(response.response_body.data);
                if (!json_data.status || json_data.status !== 'success' || !json_data.data.current || !json_data.data.current.pollution) {
                    this.log(true, ['Remote server error:', response.response_body.data]);
                    return;
                }
                let json_aqi = 0;
                // AQI standard
                if (this.settings.get_value('aqi').unpack() === 'CN AQI') {
                    json_aqi = json_data.data.current.pollution.aqicn;
                } else {
                    json_aqi = json_data.data.current.pollution.aqius;
                }
                // AQL level
                if (json_aqi < 51) { // Good
                    this.quality_icon.icon_name = 'face-smile-symbolic'
                } else if (json_aqi < 101) { // Moderate
                    this.quality_icon.icon_name = 'face-plain-symbolic'
                } else if (json_aqi < 151) { // Unhealthy for sensitive groups
                    this.quality_icon.icon_name = 'face-sad-symbolic'
                } else if (json_aqi < 201) { // Unhealthy
                    this.quality_icon.icon_name = 'face-worried-symbolic'
                } else if (json_aqi < 301) { // Very unhealthy
                    this.quality_icon.icon_name = 'face-yawn-symbolic'
                } else { // Hazardous
                    this.quality_icon.icon_name = 'face-sick-symbolic'
                }
                this.log(false, [`Update AQI from: ${this.quality_value.text} to ${json_aqi.toString() + ' / ' + this.settings.get_value('aqi').unpack()
                    }`]);
                this.quality_value.text = json_aqi.toString();
                if (!this.settings.get_value('hide-unit').unpack()) {
                    this.quality_value.text += ' / ' + this.settings.get_value('aqi').unpack();
                }
                this.location.label_actor.text = `${this.settings.get_value('city').unpack()}, ${this.settings.get_value('state').unpack()}, ${this.settings.get_value('country').unpack()}`;
                this.lastUpdate.label_actor.text = 'Last update: ' + new Date(json_data.data.current.pollution.ts).toLocaleTimeString();;
            });
            this.lock = false;
            this.purgeBackgroundTask();
            this.periodic_task = Mainloop.timeout_add_seconds(3600 * 2, () => { this.refreshData });
        }

        log(isErr, logs) {
            global.log('[IqairMenuButton]', logs.join(', '));
            if (isErr) {
                let notifSource = new MessageTray.SystemNotificationSource();
                let notification = new MessageTray.Notification(notifSource, "IQAir error", logs.join(', '));
                Main.messageTray.add(notifSource);
                notification.setTransient(true);
                notifSource.showNotification(notification);
            }
        }

        paramNormaliser(params) {
            for (let index = 0; index < params.length; index++) {
                let keyValue = params[index].split('=');
                if (keyValue.length === 2) {
                    keyValue[1] = keyValue[1].replace(/[^\w]+/gi, '-');
                    params[index] = keyValue[0] + '=' + keyValue[1];
                }
            }
        }
        
        purgeBackgroundTask() {
            if (this.periodic_task) {
                GLib.Source.remove(this.periodic_task);
                this.periodic_task = null;
            }
        }
    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new AQIIndicator();

        const indicator_position = this._indicator.settings.get_value('panel-position').unpack()
        if (indicator_position === 'Left') {
            Main.panel.addToStatusArea(this._uuid, this._indicator, Main.panel._leftBox.get_children().length, 'left');
        } else if (indicator_position === 'Center') {
            Main.panel.addToStatusArea(this._uuid, this._indicator, Main.panel._centerBox.get_children().length, 'center');
        } else {
            Main.panel.addToStatusArea(this._uuid, this._indicator);
        }
        this._indicator.settings.connect('changed::panel-position', () => { this.addToPanel() });
    }

    disable() {
        this._indicator.purgeBackgroundTask();
        this._indicator.destroy();
        this._indicator = null;
    }

    addToPanel() {
        print('Reloading Iqair extension');
        this._indicator.purgeBackgroundTask();
        this._indicator.destroy();
        this._indicator = null;
        this._indicator = new AQIIndicator();
        const indicator_position = this._indicator.settings.get_value('panel-position').unpack()
        if (indicator_position === 'Left') {
            Main.panel.addToStatusArea(this._uuid, this._indicator, Main.panel._leftBox.get_children().length, 'left');
        } else if (indicator_position === 'Center') {
            Main.panel.addToStatusArea(this._uuid, this._indicator, Main.panel._centerBox.get_children().length, 'center');
        } else {
            Main.panel.addToStatusArea(this._uuid, this._indicator);
        }
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
