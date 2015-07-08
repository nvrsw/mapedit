#!/bin/sh

[ "$VERSION" = "" ] && VERSION=$(grep '<title>VMS MAP Editor' app/app.html | awk '{print $4}' | sed 's/<.*$//g'
)
[ "$PLATFORMS" = "" ] && PLATFORMS='win-ia32'

rm -rf vms-mapedit*

# Make a package
rm -f app.nw && cd app && zip -q -r -9 ../app.nw * && cd ..

for platform in $PLATFORMS; do
  echo -ne "$platform \t==> "
  nwjs="nwjs/$platform"
  case $platform in
    linux-*)
      suffix=""
      ;;
    win-*)
      suffix=".exe"
      ;;
    *)
      echo "not yet supported platform"
      exit 1
      ;;
  esac

  dir="vms-mapedit-$VERSION-$platform-"$(date +"%Y%m%d")
  mkdir -p $dir

  cat "nwjs/$platform/nw$suffix" app.nw > "$dir/mapedit$suffix"
  [ "$suffix" = ".exe" ] || chmod +x "$dir/mapedit$suffix"
  cp "nwjs/$platform/icudtl.dat" $dir
  cp "nwjs/$platform/nw.pak" $dir

  cp -fr samples $dir
  cp -fr ../doc/ChangeLog-mapedit.html $dir/ChangeLog.html

  if [ "$suffix" = ".exe" ]; then
    echo "$dir".zip
    zip -q -r -9 "$dir".zip $dir
  else
    echo "$dir".tar.xz
    tar cJf "$dir".tar.xz $dir
  fi

  rm -rf $dir
done

rm -f app.nw
