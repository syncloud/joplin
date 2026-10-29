#!/bin/bash -ex

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

${DIR}/../build/snap/node/node.sh --version
test -f ${DIR}/../build/snap/joplin/packages/server/dist/app.js
