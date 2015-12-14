#!/bin/sh

DIR=nwjs
BASE=http://dl.nwjs.io/latest/

LIST=$(curl -s $BASE | \
       grep 'nwjs-v[0-9\.]' | \
       grep 'linux-ia32\|linux-x64\|win-ia32\|win-x64' | \
       grep -o -E 'href="([^"#]+)"' | cut -d'"' -f2)

mkdir -p $DIR/
for i in $LIST; do
    [ -f $DIR/$i ] && continue
    echo "Downloading $i..."
    curl $BASE/$i -o $DIR/$i
done

for i in $LIST; do
    [ -f $DIR/$i ] || continue
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
done
