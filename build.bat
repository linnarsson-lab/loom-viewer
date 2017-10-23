@echo off

echo.
echo ==========================
echo  Deleting old build files
echo ==========================
echo.

del /s /q python\loom_viewer\static\*.*
del /s /q python\build\*.*
del /s /q python\dist\*.*
del /s /q python\loom_viewer\static
del /s /q python\build
del /s /q python\dist

:: Build static assets
echo.
IF /i "%1"=="prod" (
    echo ==========================================================
    echo  Building for production. Minifying + bundling production
    echo          build and inserting it into HTML template
    echo ==========================================================
    echo.
    webpack --config=webpack.config.prod.js --progress --profile --colors
    cd .\python
    move .\loom_viewer\index.html .\loom_viewer\static\index.html
    echo.
    echo ================================
    echo  Installing loom python package
    echo ================================
    echo.
    :: I haven't figured out how to both generate correct paths in the webpack HTML
    :: template, and have the resulting index.html be put in the right folders.
    :: Yes, this is an ugly hack around my incompetence, but it works - Job
    python setup.py install --force
    cd ..
) ELSE (
    echo ================================================================
    echo  Bundling development build and inserting it into HTML template
    echo ================================================================
    echo.
    webpack --config=webpack.config.dev.js --progress --profile --colors
    cd .\python
    move .\loom_viewer\index.html .\loom_viewer\static\index.html
    echo.
    echo ================================
    echo  Installing loom python package
    echo ================================
    echo.
    :: I haven't figured out how to both generate correct paths in the webpack HTML
    :: template, and have the resulting index.html be put in the right folders.
    :: Yes, this is an ugly hack around my incompetence, but it works - Job
    python setup.py install --force
    cd ..
)
