@echo off

echo.
echo ================================================
echo  Removing previous WebPack build files (if any)
echo ================================================
echo.

del /s /q python\loom_viewer\static\*.*
del /s /q python\loom_viewer\static

echo.
echo   Done
echo.

echo.
IF /i "%1"=="prod" (
    echo ==========================================================
    echo  Building for production. Minifying + bundling production
    echo          build and inserting it into HTML template
    echo ==========================================================
    echo.
    webpack --config=webpack.config.prod.js --progress --profile --colors
) ELSE (
    echo ================================================================
    echo  Bundling development build and inserting it into HTML template
    echo ================================================================
    echo.
    webpack --config=webpack.config.dev.js --progress --profile --colors
)