#!/bin/sh

curl -X POST http://localhost:5984/lab_development -H "Content-Type: application/json" -d@$1
