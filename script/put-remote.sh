#!/bin/bash

curl -X POST http://localhost:5985/lab_production -H "Content-Type: application/json" -d@$1
