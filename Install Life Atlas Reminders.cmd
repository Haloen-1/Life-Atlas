@echo off
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0windows-reminders.ps1" -Install
