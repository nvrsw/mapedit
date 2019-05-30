#!/bin/sh

DIR=nwjs
VERSION=v0.12.3
BASE=http://dl.nwjs.io/$VERSION

LIST="nwjs-$VERSION-linux-ia32.tar.gz
      nwjs-$VERSION-linux-x64.tar.gz
      nwjs-$VERSION-win-ia32.zip
      nwjs-$VERSION-win-x64.zip"

mkdir -p $DIR/
for i in $LIST; do
    [ -f $DIR/$i ] && continue
    echo "Downloading $i..."
    curl $BASE/$i -o $DIR/$i
done

for i in $LIST; do
    echo "Extracting $i..."
    odir=$(echo $i | cut -d- -f1,2,3,4 | cut -d. -f1,2,3)
    ndir=$(echo $i | cut -d- -f3,4 | cut -d. -f1)
    rm -rf $DIR/$odir $DIR/$ndir
    ext="${i##*.}"
    case $ext in
	zip)
	    (cd $DIR; unzip -qq $i)
	    ;;
	*)
	    (cd $DIR; tar xf $i)
	    ;;
    esac
    mv $DIR/$odir $DIR/$ndir
    echo "dist/$ndir"
    [ -d dist/$ndir ] && cp -f dist/$ndir/* $DIR/$ndir
done
