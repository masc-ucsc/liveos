#!/bin/sh
forever stop server.js
forever stop latex_daemon.js
forever stop csearch_daemon.js
forever stop terminal_daemon.js
docker rm -f $(docker ps -a -q)
