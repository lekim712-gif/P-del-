#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Falta instalar Node.js. Se abrira la pagina de descarga."
  echo "Descarga la version LTS, instalala y vuelve a hacer doble clic en este archivo."
  open https://nodejs.org
  read -p "Pulsa Enter para cerrar"
  exit 1
fi
[ -d node_modules ] || { echo "Instalando por primera vez, puede tardar un par de minutos..."; npm install; }
npm run db:reset
echo
echo "La app se abrira en el navegador. No cierres esta ventana mientras la uses."
( sleep 6; open http://localhost:3000 ) &
npm run dev
