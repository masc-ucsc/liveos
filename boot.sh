#!/bin/sh
if [ ! -d "logs" ]; then
  mkdir logs
fi
forever -o logs/server.out -e logs/server.err start server.js
sleep 1
forever -o logs/latex.out -e logs/latex.err start latex_daemon.js
forever -o logs/csearch.out -e logs/csearch.err start csearch_daemon.js
forever -o logs/terminal_shell.out -e logs/terminal_shell.err start terminal_daemon.js
