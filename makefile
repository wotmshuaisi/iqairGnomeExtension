debug:
	rsync -av --exclude=.git ./src/ ~/.local/share/gnome-shell/extensions/iqair@wotmshuaisi_github && busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting…")' && journalctl -f

clean:
	gnome-extensions uninstall iqair@wotmshuaisi_github && rm -rf ~/.local/share/gnome-shell/extensions/iqair@wotmshuaisi_github 

install:
	rsync -av --exclude=.git ./src/ ~/.local/share/gnome-shell/extensions/iqair@wotmshuaisi_github && gnome-shell-extension-tool -e iqair@wotmshuaisi_github

build:
	rm -rf iqair@wotmshuaisi_github.zip
	cd src && zip -qr ../iqair@wotmshuaisi_github.zip . && cd ..