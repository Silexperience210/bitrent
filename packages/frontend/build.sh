#!/bin/bash
mkdir -p public
cp *.html public/
cp -r libs public/
echo "Build completed - public folder ready"
