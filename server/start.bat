@echo off
title 光之回响 - 一键启动
echo ==============================================
echo   光之回响 · 一键启动（Bridge + 前端）
echo ==============================================
echo.

REM 解析项目根目录（本文件位于 server\ 下，根目录是上一级）
for %%I in ("%~dp0..") do set "ROOT=%%~fI"

REM ---- 1. 检测 Python（bridge.py 纯标准库，任意 Python 3 均可）----
set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY (
    where py >nul 2>nul && set "PY=py -3"
)
if not defined PY (
    if exist "K:\ComfyUI\ComfyUI\.venv\Scripts\python.exe" set "PY=K:\ComfyUI\ComfyUI\.venv\Scripts\python.exe"
)
if not defined PY (
    echo [错误] 未找到 Python 3，请安装后重试
    pause
    exit /b 1
)
echo [OK] Python: %PY%
echo.

REM ---- 2. 启动 Bridge（端口 9999，WindBot / MDPro3 由它按需拉起）----
netstat -ano | findstr /c:":9999 " | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [跳过] Bridge 已在运行（9999）
) else (
    start "光之回响 Bridge" /D "%~dp0" cmd /k "%PY% bridge.py"
    echo [启动] Bridge 窗口已打开（9999），日志显示在该窗口内
)
echo.

REM ---- 3. 启动前端（端口 8080）----
netstat -ano | findstr /c:":8080 " | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [跳过] 前端已在运行（8080）
) else (
    start "光之回响 前端" /min /D "%ROOT%" cmd /c "%PY% -m http.server 8080"
    echo [启动] 前端已启动（8080）
)
echo.

REM ---- 4. 等前端就绪后自动打开浏览器 ----
set "READY="
for /l %%i in (1,1,30) do (
    curl -s -o nul http://localhost:8080 && set "READY=1" && goto :open
    ping -n 2 127.0.0.1 >nul
)
:open
if defined READY (
    start "" http://localhost:8080
    echo [OK] 浏览器已打开 http://localhost:8080
) else (
    echo [警告] 前端 30 秒内未就绪，请检查弹出的窗口是否有报错
)
echo.
echo 本窗口可直接关闭；Bridge / 前端窗口用 Ctrl+C 或直接关掉即可停止
echo 对战由前端页面触发，bridge 会自动拉起 ygopro-server + WindBot + MDPro3
pause
