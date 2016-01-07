#!/bin/env node

var watcher = require('node-watch-changes');

var configPath = process.argv[2];
watcher(configPath);
