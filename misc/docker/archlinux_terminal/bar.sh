#!/bin/sh
docker rm archlinux_terminal_test
docker build -t mascucsc/liveos_terminal_archlinux .
docker run --name archlinux_terminal_test -it mascucsc/liveos_terminal_archlinux
