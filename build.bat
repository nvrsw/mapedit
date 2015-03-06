del /q release
mkdir release
cd app
..\7z\7za.exe a app.zip *
move app.zip ..\app.nw
cd ..
copy /b nwjs\win-ia32\nw.exe+app.nw release\app.exe
copy nwjs\win-ia32\icudtl.dat release\
copy nwjs\win-ia32\nw.pak release\
mkdir release\samples
copy samples\* release\samples\
copy ..\doc\ChangeLog-mapedit.md release\ChangeLog.txt
del app.nw

cd release
ren app.exe mapedit.exe
cd ..
