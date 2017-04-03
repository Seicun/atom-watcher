'use strict';

var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var Task = require('atom').Task;
var Convert = require('ansi-to-html');
var convert;

var isWindows = /^win/.test(process.platform);

var WatcherView = require('./atom-watcher-view.js');
var CompositeDisposable = require('atom').CompositeDisposable;

var cwd = path.resolve(__dirname, '..');
var projectDirectory;

var Watcher = function() {
	this.watcher = null;
	this.watcherView = null;
	this.subscriptions = null;
	this.running = false;
	this.configPath = '';
	this.panel = null;
};

Watcher.prototype = {
	activate: function(state) {
		this.watcherView = new WatcherView(state.viewState);

		this.panel = atom.workspace.addBottomPanel({
			item: this.watcherView.getElement()
		});

		this.subscriptions = new CompositeDisposable();

		this.subscriptions.add(atom.commands.add('atom-workspace', {
			'atom-watcher:start': (function(self) {
				return function() {
					return self.start();
				};
			})(this)
		}));

		this.subscriptions.add(atom.commands.add('atom-workspace', {
			'atom-watcher:toggle': function(self) {
				return function() {
					return self.toggle();
				};
			}(this)
		}));

		atom.emitter.on('atom-watcher:toggle', (function(self) {
			return function() {
				return self.toggle();
			};
		})(this));

		atom.emitter.on('atom-watcher:createConfig', (function(self) {
			return function() {
				var configPath = self.getConfigPath();

				try {
					fs.statSync(configPath);
				} catch (e) {
					fs.createReadStream(cwd + '/misc/defaultConfig.js').pipe(fs.createWriteStream(configPath));

					atom.notifications.addSuccess('atom-watcher', {
						detail: 'Configuration file was successfully created: ' + configPath,
						dismissable: true
					});
				}

				atom.workspace.open(configPath);
			};
		})(this));

		atom.emitter.on('atom-watcher:shown', (function(self) {
			return function() {
				if (!convert) {
					convert = new Convert({
						fg: self.watcherView.getTextColor()
					});
				}
			}
		})(this));

		atom.styles.onDidUpdateStyleElement((function(self) {
			return function() {
				convert = new Convert({
					fg: self.watcherView.getTextColor()
				});
			}
		})(this));

		if (atom.config.get('atom-watcher.autoStart')) {
			this.start();
		}

		if (this.watcherView.visible) {
			this.watcherView.show();
		} else {
			this.watcherView.hide();
		}

		return this;
	},

	serialize: function() {
		return {
			viewState: this.watcherView.serialize()
		};
	},

	deactivate: function() {
		if (this.watcher && !this.watcher.killed) {
			this.watcher.kill();
		}

		if (this.statusBarIcon) {
			this.statusBarIcon.destroy();
		}

		if (this.panel) {
			this.panel.destroy();
		}
	},

	consumeStatusBar: function(statusBar) {
		this.statusBarIcon = statusBar.addLeftTile({
			item: this.watcherView.getStatusBarIcon(),
			priority: 100
		});
	},

	start: function() {
		if (this.running) {
			this.stop();
		}

		this.configPath = this.getConfigPath();

		try {
			fs.statSync(this.configPath);
		} catch (e) {
			this.watcherView.appendText('No configuration file was found. The searched path was »' + this.configPath + '«.');
			return false;
		}

		process.chdir(projectDirectory); // Make sure that the spawned children operate in the right direcotry.

		this.watcher = spawn(atom.config.get('atom-watcher.nodeExecutable'), [
			cwd + '/bin/atom-watcher.js',
			this.configPath,
			'--color'
		]);

		var self = this;

		this.watcher.on('error', function() {
			var errorText = 'NodeJS could not be started. Please make sure you have node in your global path variable.';
			self.watcherView.appendText(errorText);
			atom.notifications.addError('atom-watcher', {
				detail: errorText,
				dismissable: true
			});

			self.running = true;
			self.watcherView.setStatus('stopped');
		});

		this.watcher.stdout.on('data', function(buffer) {
			self.watcherView.appendText('<pre>' + convert.toHtml(buffer.toString()) + '</pre>');
		});

		this.watcher.stderr.on('data', function(buffer) {
			self.watcherView.appendText('<pre>' + convert.toHtml(buffer.toString()) + '</pre>');
		});

		this.watcher.on('error', function() {
			console.log('ERROR', arguments);
		});

		this.watcher.on('exit', function(code) {
			self.watcherView.appendText('<br />The watcher exited with code ' + code + '<br />');
			self.watcher = null;
			self.running = false;
			self.watcherView.setStatus('stopped');
		});

		this.running = true;
		this.watcherView.setStatus('started');

		return true;
	},

	stop: function() {
		if (this.watcher) {
			this.watcher.kill();
		}

		this.watcher = null;
		this.running = false;
		this.watcherView.setStatus('stopped');
	},

	toggle: function() {
		if (!this.running) {
			if (!this.start()) {
				atom.notifications.addWarning('atom-watcher', {
					detail: 'No configuration file was found. The searched path was »' + this.configPath + '«.',
					dismissable: true
				});
			}
		} else {
			this.stop();
		}
	},

	getConfigPath: function() {
		if (!projectDirectory) {
			var paths = atom.project.getPaths();

			if (!paths.length) {
				return '';
			}

			projectDirectory = paths[0];
		}

		var configFileName = atom.config.get('atom-watcher.configFileName');
		var configPath;

		if (!isWindows && configFileName.indexOf('/') === 0 || isWindows && configFileName.indexOf(':') === 1) { // Path is absolute
			configPath = configFileName;
		} else { // Path is relative
			configPath = projectDirectory + path.sep + configFileName;
		}

		return configPath;
	}
};

module.exports = new Watcher();

module.exports.config = {
	autoStart: {
		title: 'Automatic start',
		description: 'The watcher looks for a config file and starts automatically if it finds one.',
		type: 'boolean',
		default: false
	},

	configFileName: {
		title: 'Configuration file name',
		description: 'Either relative to the project directory or absolute.',
		type: 'string',
		default: 'watcherConfig.js'
	},

	nodeExecutable: {
		title: 'Node executable',
		description: 'Mac user please type the full path to your node executable.',
		type: 'string',
		default: 'node'
	}
};
