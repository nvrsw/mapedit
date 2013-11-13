mkdir release
cd app
..\7z\7za.exe a app.zip *
move app.zip ..\app.nw
cd ..
copy /b node-webkit\win-ia32\nw.exe+app.nw release\app.exe
copy node-webkit\win-ia32\icudt.dll release\
copy node-webkit\win-ia32\nw.pak release\
del app.nw

@rem pause
