#!/usr/bin/env bash

docker build -t slack-dump-export:latest .
docker image prune -f