@echo off
setlocal
cd /d "%~dp0"
echo [%date% %time%] Starting Sentinel AI frontend dev server...> frontend-runtime.log
call npm.cmd run dev >> frontend-runtime.log 2>&1
echo [%date% %time%] Dev server exited with code %errorlevel%>> frontend-runtime.log
