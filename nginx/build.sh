#!/bin/bash -ex

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

BUILD_DIR=${DIR}/../build/snap/nginx
rm -rf ${BUILD_DIR}
mkdir -p ${BUILD_DIR}
cp -a /etc /usr ${BUILD_DIR}
cp -a /lib ${BUILD_DIR}/lib
mkdir -p ${BUILD_DIR}/bin
cp ${DIR}/bin/nginx.sh ${BUILD_DIR}/bin/nginx.sh

${BUILD_DIR}/bin/nginx.sh -version
