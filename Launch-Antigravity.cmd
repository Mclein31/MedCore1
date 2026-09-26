@echo off
setlocal EnableDelayedExpansion
title Antigravity Agent Hub
cd /d "C:\Users\JEREIMU\Documents\Projects\MedCore1"

:MENU
cls
echo ===================================================================
echo                     ANTIGRAVITY AGENT HUB
echo ===================================================================
echo Machine: %COMPUTERNAME% (User: %USERNAME%)
echo Workspace: %CD%
echo.
echo Active Custom Agents:
echo   [1] Default Pair Programmer  - Antigravity CLI
echo   [2] code-reviewer            - Review code, bugs and security
echo   [3] project-brain-keeper     - Maintains .brain and Obsidian
echo   [4] project-manager          - Coordinates work and architecture
echo   [5] prompt-maker             - Prompt engineering specialist
echo   [6] researcher               - Technical, API and library research
echo.
echo CLI Quick Tips:
echo   - Inside any session, type /agents to switch agents
echo   - Inside any session, type /help to view all slash commands
echo   - To exit any session, type /exit
echo ===================================================================
set "CHOICE="
set /p "CHOICE=Select agent to launch [1-6, default=1]: "

if "%CHOICE%"=="2" goto LAUNCH_2
if "%CHOICE%"=="3" goto LAUNCH_3
if "%CHOICE%"=="4" goto LAUNCH_4
if "%CHOICE%"=="5" goto LAUNCH_5
if "%CHOICE%"=="6" goto LAUNCH_6
goto LAUNCH_1

:LAUNCH_1
echo Starting default Antigravity CLI...
"C:\Users\JEREIMU\AppData\Local\agy\bin\agy.exe"
goto END

:LAUNCH_2
echo Starting code-reviewer agent...
"C:\Users\JEREIMU\AppData\Local\agy\bin\agy.exe" --agent code-reviewer
goto END

:LAUNCH_3
echo Starting project-brain-keeper agent...
"C:\Users\JEREIMU\AppData\Local\agy\bin\agy.exe" --agent project-brain-keeper
goto END

:LAUNCH_4
echo Starting project-manager agent...
"C:\Users\JEREIMU\AppData\Local\agy\bin\agy.exe" --agent project-manager
goto END

:LAUNCH_5
echo Starting prompt-maker agent...
"C:\Users\JEREIMU\AppData\Local\agy\bin\agy.exe" --agent prompt-maker
goto END

:LAUNCH_6
echo Starting researcher agent...
"C:\Users\JEREIMU\AppData\Local\agy\bin\agy.exe" --agent researcher
goto END

:END
echo.
echo CLI session ended.
pause
goto MENU
