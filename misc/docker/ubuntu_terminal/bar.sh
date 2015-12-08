#!/bin/sh
docker rm ubuntu_terminal_test
docker build -t mascucsc/liveos_terminal_ubuntu .
docker run --name ubuntu_terminal_test -it mascucsc/liveos_terminal_ubuntu
