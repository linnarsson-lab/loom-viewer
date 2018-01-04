@echo off

echo.
echo ===================================
echo  Building Client Web App (WebPack)
echo ===================================

echo.
echo === Removing previous client build files (if any)
echo.

del /s /q python\loom_viewer\static\*.*
del /s /q python\loom_viewer\static

echo.
echo   Done
echo.

echo.

IF /i "%1"=="prod" (
    echo === Run WebPack with production build
    echo.

    webpack --config=webpack.config.prod.js --progress --profile --colors

    :: I haven't figured out how to both generate correct paths in the webpack HTML
    :: template, and have the resulting index.html be put in the right folders.
    :: Yes, this is an ugly hack around my incompetence, but it works - Job
    copy .\client\images\favicon.ico .\python\loom_viewer\static\
    move .\python\loom_viewer\index.html .\python\loom_viewer\static\index.html

    echo.
    echo   Done
    echo.

) ELSE (
    echo === Run WebPack with development build
    echo.

    webpack --config=webpack.config.dev.js --progress --profile --colors

    copy .\client\images\favicon.ico .\python\loom_viewer\static\
    move .\python\loom_viewer\index.html .\python\loom_viewer\static\index.html

	 echo.
    echo   Done
    echo.

)