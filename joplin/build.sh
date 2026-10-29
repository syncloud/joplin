#!/bin/bash -ex

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

REPO=$1
BRANCH=$2

SRC=${DIR}/../build/joplin-src
APP_OUT=${DIR}/../build/snap/joplin
rm -rf ${SRC} ${APP_OUT}
mkdir -p ${SRC} ${APP_OUT}

${DIR}/../apt.sh python3 libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

cd ${SRC}
git init -q
git remote add origin ${REPO}
for i in $(seq 1 10); do
  if git fetch -q --depth 1 origin ${BRANCH}; then
    break
  fi
  if [[ $i -eq 10 ]]; then
    exit 1
  fi
  sleep 10
done
git checkout -q FETCH_HEAD
git log -1 --format="%H %s"

KEEP="fork-htmlparser2 fork-sax fork-uslug htmlpack lib renderer server tools turndown turndown-plugin-gfm utils"
for package in packages/*; do
  if [[ ! " ${KEEP} " =~ " $(basename ${package}) " ]]; then
    rm -rf ${package}
  fi
done
sed -i '/onenote-converter/d' packages/lib/package.json
sed -i 's/foreach --worktree --parallel --verbose --interlaced run tsc/foreach --worktree --verbose --interlaced run tsc/' package.json
grep -q '"tsc": "yarn workspaces foreach --worktree --verbose --interlaced run tsc"' package.json

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export YARN_ENABLE_IMMUTABLE_INSTALLS=false
corepack enable

for i in $(seq 1 5); do
  if BUILD_SEQUENCIAL=1 yarn install --inline-builds; then
    break
  fi
  if [[ $i -eq 5 ]]; then
    exit 1
  fi
  sleep 10
done

cd packages/server
yarn tsc
yarn test dist/utils/oidc.test.js dist/env.test.js
cd ${SRC}

sed -i 's/"postinstall": ".*"/"postinstall": ""/' package.json packages/*/package.json
for i in $(seq 1 5); do
  if yarn workspaces focus --production --all; then
    break
  fi
  if [[ $i -eq 5 ]]; then
    exit 1
  fi
  sleep 10
done

cp -a packages ${APP_OUT}/packages
cd ${APP_OUT}/packages/server
rm -rf logs temp resource
mkdir logs
ln -s /var/snap/joplin/current/temp temp
ln -s /var/snap/joplin/current/resource resource
test -f dist/app.js

du -sh ${APP_OUT}
