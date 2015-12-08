#!/bin/sh
docker rm test
docker build -t mascucsc/liveos .
docker run --name test -it --privileged -p 8080:8080 -p 8081:8081 -p 8082:8082 -p 8083:8083 -p 8084:8084 -p 8085:8085 -p 8086:8086 mascucsc/liveos
