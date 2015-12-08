#!/bin/bash
RES=$(grep "waiting for connections on port 27017" logs/mongo.out)
while [ -z "$RES" ]
do
  sleep 1
  RES=$(grep "waiting for connections on port 27017" logs/mongo.out)
done
sleep 1
