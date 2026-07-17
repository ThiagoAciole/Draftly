#!/usr/bin/env bash
#
# Converte os ícones de tipo de arquivo (.ico) para PNG nos tamanhos
# padrão do tema hicolor do Linux.
#
# Uso: ./scripts/generate-mimetype-icons.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RESOURCES_DIR="$PROJECT_DIR/src-tauri/resources"
MIMETYPES_DIR="$PROJECT_DIR/src-tauri/icons/mimetypes"

# Mapeamento: arquivo .ico → nome do ícone MIME (sem .png)
# O nome do ícone no Linux é o MIME type com "/" trocado por "-"
declare -A MIME_ICONS=(
  ["file-markdown.ico"]="text-markdown"
  ["file-txt.ico"]="text-plain"
  ["file-json.ico"]="application-json"
  ["file-js.ico"]="text-javascript"
  ["file-ts.ico"]="text-typescript"
  ["file-py.ico"]="text-x-python"
  ["file-html.ico"]="text-html"
)

SIZES=(16 32 48 64 128 256)

echo "Gerando ícones MIME para Linux..."
echo "Origem : $RESOURCES_DIR"
echo "Destino: $MIMETYPES_DIR"
echo ""

for size in "${SIZES[@]}"; do
  mkdir -p "$MIMETYPES_DIR/${size}x${size}"
done

for ico_file in "${!MIME_ICONS[@]}"; do
  icon_name="${MIME_ICONS[$ico_file]}"
  src="$RESOURCES_DIR/$ico_file"

  if [ ! -f "$src" ]; then
    echo "AVISO: $src não encontrado, pulando..."
    continue
  fi

  echo "Convertendo $ico_file → $icon_name.png:"
  for size in "${SIZES[@]}"; do
    dest="$MIMETYPES_DIR/${size}x${size}/${icon_name}.png"
    convert "$src" -resize "${size}x${size}" "$dest"
    echo "  ${size}×${size} ✓"
  done
done

echo ""
echo "Ícones gerados em: $MIMETYPES_DIR"
echo "Estrutura criada:"
find "$MIMETYPES_DIR" -type f | sort | while read -r f; do
  rel="${f#$PROJECT_DIR/}"
  echo "  $rel"
done
