#!/bin/bash -e

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

exec ${DIR}/ld.sh ${DIR}/usr/local/bin/node "$@"
