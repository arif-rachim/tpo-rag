@echo off
echo Installing packages from requirements.txt...
echo.

uv pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu --index-strategy unsafe-best-match

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Installation completed successfully!
) else (
    echo.
    echo Installation failed with error code %ERRORLEVEL%
)

pause
