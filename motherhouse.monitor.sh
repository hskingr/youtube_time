#!/bin/bash

docker --context motherhouse compose -f docker-compose.prod.yml logs -f --tail=100