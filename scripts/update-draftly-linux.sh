#!/usr/bin/env sh

set -eu

REPOSITORY="ThiagoAciole/Draftly"
RELEASE_API="https://api.github.com/repos/${REPOSITORY}/releases/latest"
TEMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TEMP_DIR"
}

trap cleanup EXIT INT TERM

if ! command -v apt >/dev/null 2>&1; then
  echo "Este atualizador suporta apenas Debian, Ubuntu e derivados com apt."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "O curl e necessario. Instale-o com: sudo apt install curl"
  exit 1
fi

echo "Procurando a versao mais recente do Draftly..."
release_json="$(curl --fail --silent --show-error --location "$RELEASE_API")"
asset_url="$(printf '%s' "$release_json" | grep -oE 'https://[^"]+\.deb' | head -n 1)"

if [ -z "$asset_url" ]; then
  echo "Nenhum pacote .deb foi encontrado na ultima Release do Draftly."
  exit 1
fi

package_path="$TEMP_DIR/draftly.deb"
echo "Baixando: $asset_url"
curl --fail --silent --show-error --location "$asset_url" --output "$package_path"

echo "Atualizando o Draftly..."
if [ "$(id -u)" -eq 0 ]; then
  apt install --yes "$package_path"
else
  sudo apt install --yes "$package_path"
fi

echo "Atualizando cache de ícones..."

update_icon_cache() {
  if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    touch /usr/share/icons/hicolor
    gtk-update-icon-cache -t -f /usr/share/icons/hicolor 2>/dev/null || true
  fi
  if command -v update-mime-database >/dev/null 2>&1; then
    update-mime-database /usr/share/mime 2>/dev/null || true
  fi
  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database /usr/share/applications 2>/dev/null || true
  fi
}

if [ "$(id -u)" -eq 0 ]; then
  update_icon_cache
else
  sudo sh -c "
    $(declare -f update_icon_cache)
    update_icon_cache
  "
fi

echo "Draftly atualizado com sucesso."
