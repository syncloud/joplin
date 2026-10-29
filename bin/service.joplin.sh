#!/bin/bash -e

${SNAP}/bin/wait-for-configure.sh

set -a
. ${SNAP_DATA}/config/joplin.env
set +a

/bin/rm -f ${APP_SOCKET}

cd ${SNAP}/joplin/packages/server
exec ${SNAP}/node/node.sh --disable-proto=delete dist/app.js
