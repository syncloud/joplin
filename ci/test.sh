#!/bin/bash -ex

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
cd ${DIR}/../test

SPEC=$1
DISTRO=$2
APP=$3
DOMAIN=${DISTRO}.com
APP_DOMAIN=${APP}.${DOMAIN}

getent hosts ${APP_DOMAIN} | sed "s/${APP_DOMAIN}/auth.${DOMAIN}/g" | tee -a /etc/hosts

./deps.sh
py.test -x -s ${SPEC} --distro=${DISTRO} --ver=${DRONE_BUILD_NUMBER} --app=${APP}
