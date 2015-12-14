#!/bin/sh

ROOT_DIR="."
DEST_DIR="${DEST}/opt/vms-mapedit"
INSTALL_MKDIR="install -m 755 -d"

${INSTALL_MKDIR} ${DEST_DIR}
cp -rf ${ROOT_DIR}/app ${DEST_DIR}/
cp -rf ${ROOT_DIR}/samples ${DEST_DIR}/
cp -f ${ROOT_DIR}/mapedit-linux-x64 ${DEST_DIR}/
${INSTALL_MKDIR} ${DEST_DIR}/nwjs
cp -rf ${ROOT_DIR}/nwjs/linux-x64 ${DEST_DIR}/nwjs
${INSTALL_MKDIR} ${DEST}/usr/bin
ln -sf /opt/vms-mapedit/mapedit-linux-x64 ${DEST}/usr/bin/vms-mapedit