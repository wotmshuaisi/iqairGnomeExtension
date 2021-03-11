debug:
	rsync -av --exclude=.git ./src/ ~/.local/share/gnome-shell/extensions/IqairGnomeExtension@wotmshuaisi_github && gnome-shell-extension-tool disable IqairGnomeExtension@wotmshuaisi_github && gnome-shell-extension-tool enable IqairGnomeExtension@wotmshuaisi_github && gnome-shell-extension-prefs

clean:
	rm -rf ~/.local/share/gnome-shell/extensions/IqairGnomeExtension@wotmshuaisi_github && gnome-shell-extension-tool uninstall IqairGnomeExtension@wotmshuaisi_github

install:
	rsync -av --exclude=.git ./src/ ~/.local/share/gnome-shell/extensions/IqairGnomeExtension@wotmshuaisi_github && gnome-shell-extension-tool enable IqairGnomeExtension@wotmshuaisi_github

build:
	rm -rf IqairGnomeExtension@wotmshuaisi_github.zip
	cd src && zip -qr ../IqairGnomeExtension@wotmshuaisi_github.zip . && cd ..