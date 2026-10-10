@echo off
chcp 65001 >nul
title Escuela de Padel - Demo
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Falta instalar Node.js. Se abrira la pagina de descarga.
  echo Descarga la version LTS, instalala y vuelve a hacer doble clic en este archivo.
  start https://nodejs.org
  pause
  exit /b
)
if not exist node_modules (
  echo Instalando por primera vez, puede tardar un par de minutos...
  call npm install
)
call npm run db:reset
echo.
echo La app se abrira en el navegador. No cierres esta ventana mientras la uses.
start "" http://localhost:3000
call npm run dev
pause
