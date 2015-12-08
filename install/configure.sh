#!/bin/bash
if [ ! -d etc ]; then
  mkdir etc
fi
cp conf/server.json etc/server.json
cp conf/debug.json etc/debug.json
