@echo off

echo.
echo ====================================================
echo  Creating and installing loom-viewer Python package
echo ====================================================
echo.


echo.
echo === Removing previous Python build files (if any)
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

cd .\python
python setup.py install --force
cd ..

echo.
echo   Done
echo.