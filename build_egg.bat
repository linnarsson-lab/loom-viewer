@echo off

cd .\python

echo.
echo ====================================================
echo  Creating and installing loom-viewer Python package
echo ====================================================
echo.


echo.
echo === Removing previous Python build and dist folders (if any)
echo.

del /s /q build\*.*
del /s /q build
del /s /q dist\*.*
del /s /q dist

echo.
echo   Done
echo.

echo.
echo === Creating and installing loom-viewer Python package
echo.

python setup.py install --force

echo.
echo   Done
echo.

cd ..