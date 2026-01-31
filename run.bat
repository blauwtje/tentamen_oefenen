@echo off
setlocal

set PORT=5173
set ROOT=%~dp0
cd /d "%ROOT%"

where python >nul 2>nul
if %errorlevel%==0 (
  set PY=python
  goto start
)

where py >nul 2>nul
if %errorlevel%==0 (
  set PY=py -3
  goto start
)

echo Could not find Python (python/py).
echo Install Python from https://www.python.org/downloads/
echo Or open index.html directly (file upload works; quiz list may not).
pause
exit /b 1

:start
start "" "http://localhost:%PORT%/"
%PY% -m http.server %PORT%
