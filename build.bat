del /q release
mkdir release
cd app
..\7z\7za.exe a app.zip *
move app.zip ..\app.nw
cd ..
copy /b node-webkit\win-ia32\nw.exe+app.nw release\app.exe
copy node-webkit\win-ia32\icudtl.dat release\
copy node-webkit\win-ia32\nw.pak release\
mkdir release\samples
copy samples\* release\samples\
del app.nw

@rem pause
