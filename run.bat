@echo off
title Internet Cafe Diary Server
echo ===================================================
echo     Starting Internet Cafe Diary Dashboard...
echo     Opening http://localhost:8000 in your browser
echo ===================================================
start "" "http://localhost:8000"
php -S localhost:8000
pause
