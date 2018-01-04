@echo off

echo.
echo ===============================================
echo  Removing previous Python build files (if any)
echo ===============================================
echo.

del /s /q python\build\*.*
del /s /q python\build
del /s /q python\dist\*.*
del /s /q python\dist

echo.
echo   Done
echo.

echo.
echo ====================================================
echo  Creating and installing loom-viewer Python package
echo ====================================================
echo.

cd .\python
move .\loom_viewer\index.html .\loom_viewer\static\index.html
copy .\client\images\favicon.ico .\python\loom_viewer\static\favicon.ico
python setup.py install --force
cd ..