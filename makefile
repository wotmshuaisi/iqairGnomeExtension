debug:
	rsync -av --exclude=.git ./src/ ~/.local/share/gnome-shell/extensions/iqair-gnome-extension@wotmshuaisi_github && busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting…")' && journalctl -f

clean:
	gnome-extension uninstall iqair-gnome-extension@wotmshuaisi_github && rm -rf ~/.local/share/gnome-shell/extensions/iqair-gnome-extension@wotmshuaisi_github 

install:
	rsync -av --exclude=.git ./src/ ~/.local/share/gnome-shell/extensions/iqair-gnome-extension@wotmshuaisi_github && gnome-shell-extension-tool -e iqair-gnome-extension@wotmshuaisi_github

build:
	rm -rf iqair-gnome-extension@wotmshuaisi_github.zip
	cd src && zip -qr ../iqair-gnome-extension@wotmshuaisi_github.zip . && cd ..