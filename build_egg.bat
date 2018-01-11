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

del /s /q python\build\*.*
del /s /q python\build
del /s /q python\dist\*.*
del /s /q python\dist

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