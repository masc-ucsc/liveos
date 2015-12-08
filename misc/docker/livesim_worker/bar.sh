#!/bin/sh
docker rm worker_test
docker build -t mascucsc/livesim_worker .
docker run --name worker_test -it mascucsc/livesim_worker
