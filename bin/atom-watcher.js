#!/bin/env node

var watcher = require('node-watcher');

var configPath = process.argv[2];
watcher(configPath);
