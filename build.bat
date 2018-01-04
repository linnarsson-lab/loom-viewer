@echo off
IF /i "%1"=="prod" (
    .\build_client.bat prod
    .\build_egg.bat
) ELSE (
    .\build_client.bat
    .\build_egg.bat
)