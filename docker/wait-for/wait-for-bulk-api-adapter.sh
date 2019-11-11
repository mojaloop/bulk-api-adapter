#!/bin/sh

echo "** STARTUP - Checking for Bulk-API-Adapter..."

source /opt/wait-for/wait-for.env

sh /opt/wait-for/wait-for-kafka.sh

sh /opt/wait-for/wait-for-objstore.sh

echo "** STARTUP - Bulk-API-Adapter successful!"
