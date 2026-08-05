@echo off
chcp 65001 >nul
echo 光之回响 AI Bridge
echo ================
cd /d "%~dp0"
K:\ComfyUI\ComfyUI\.venv\Scripts\python.exe bridge.py
pause
