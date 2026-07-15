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
asset_url="$(printf '%s' "$release_json" | grep -oE '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]+\.deb"' | head -n 1 | sed -E 's/^[^\"]*"(https:[^\"]+)"$/\1/')"

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

echo "Draftly atualizado com sucesso."
