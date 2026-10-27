@echo off
rem Serves the AEM Practice Lab on http://localhost:8765 and opens it in the browser.
rem Close this window to stop the lab server (your progress stays saved in the browser).
cd /d "%~dp0"
start "" http://localhost:8765/
python -m http.server 8765
