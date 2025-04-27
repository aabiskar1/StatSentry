@echo off
echo Running hardware monitor with administrator privileges...
echo This is necessary to access CPU temperature sensors properly.
echo.

REM Try to run with elevated privileges using PowerShell
powershell -Command "Start-Process 'node' -ArgumentList 'test_native.js' -Verb RunAs"

REM If PowerShell elevation fails, tell the user how to run it manually
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Failed to run with administrator privileges automatically.
  echo Please right-click on run_as_admin.bat and select "Run as administrator".
  echo.
  pause
)
