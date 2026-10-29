#!/bin/bash -ex

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

NODE_DIR=${DIR}/../build/snap/node
rm -rf ${NODE_DIR}
mkdir -p ${NODE_DIR}

${DIR}/../apt.sh libssl3t64

cp -a /usr ${NODE_DIR}/usr
cp -a /lib ${NODE_DIR}/lib
cp ${DIR}/ld.sh ${DIR}/node.sh ${NODE_DIR}/

${NODE_DIR}/node.sh --version
du -sh ${NODE_DIR}
