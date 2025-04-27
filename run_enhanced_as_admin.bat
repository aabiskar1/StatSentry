@echo off
echo Running Enhanced PC Hardware Monitor with administrator privileges...
echo This is necessary to access CPU temperature sensors properly.
echo.

REM Try to run node in a new cmd window that stays open (/k)
powershell -Command "Start-Process cmd.exe -ArgumentList '/k node src/enhanced-monitor.js' -Verb RunAs"

REM Check if PowerShell command succeeded (Note: This might not reliably catch errors in the new process)
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Failed to start the monitor with administrator privileges automatically.
  echo Please try right-clicking on this batch file and select "Run as administrator".
  echo Or, open Command Prompt/PowerShell as Administrator and run: node src/enhanced-monitor.js
  echo.
)

echo.
echo Attempted to start the monitor in a new window. Press any key to close this launcher window...
pause > nul