'use strict';

var $ = require('atom-space-pen-views').$;
var TextEditor = require('atom').TextEditor;

var mouseDownOnTitleBar = false;

var WatcherView = function(state) {
    state = state || {};
    this.visible = state.visible || false;
    this.height = state.height || 250;

    this.$element = $('<div>', {
        class: 'atomWatcher',
        tabindex: -1
    });

    this.$titleBar = $('<div>', {
        class: 'titleBar noSelect',
        html: 'Watcher output'
    });

    var $controls = $('<ul>', {
        class: 'controls'
    });

    this.$toggleButton = $('<li>', {
        class: 'toggle icon icon-flame',
        title: 'Toggle start/stop'
    });

    var $configButton = $('<li>', {
        class: 'config icon icon-settings',
        title: 'Open watcher config file'
    });

    var $clearButton = $('<li>', {
        class: 'clear icon icon-x',
        title: 'Clear'
    });

    var $closeButton = $('<div>', {
        class: 'closeButton icon icon-chevron-down',
        title: 'Hide panel'
    });

    this.$content = $('<div>', {
        class: 'content inset-panel'
    });

    this.$titleBar.on('mousedown', (function(self) {
        return function() {
            mouseDownOnTitleBar = true;
            self.$content.addClass('noSelect');
        };
    })(this));

    this.$statusBarIcon = $('<div>', {
        class: 'inline-block atomWatcherStatusBarIcon icon icon-checklist',
        html: 'Watcher loaded'
    });

    $('body').on('mousemove', (function(self) {
        return function(e) {
            if (mouseDownOnTitleBar) {
                self.$element.css({
                    height: ($('body').height() - e.clientY - 15) + 'px'
                });
            }
        };
    })(this));

    $('body').on('mouseup', (function(self) {
        return function() {
            if (!mouseDownOnTitleBar) {
                return;
            }

            self.height = self.$element.height();
            mouseDownOnTitleBar = false;
            self.$content.removeClass('noSelect');
        };
    })(this));

    this.$toggleButton.on('click', (function(self) {
        return function() {
            atom.emitter.emit('atom-watcher:toggle');
        };
    })(this));

    $configButton.on('click', (function(self) {
        return function() {
            atom.emitter.emit('atom-watcher:createConfig');
        };
    })(this));

    $clearButton.on('click', (function(self) {
        return function() {
            return self.clear();
        };
    })(this));

    $closeButton.on('click', (function(self) {
        return function() {
            return self.hide();
        };
    })(this));

    this.$statusBarIcon.on('click', (function(self) {
        return function() {
            return self.toggle();
        };
    })(this));

    this.$toggleButton.appendTo($controls);
    $configButton.appendTo($controls);
    $clearButton.appendTo($controls);
    $controls.appendTo(this.$titleBar);
    $closeButton.appendTo(this.$titleBar)
    this.$titleBar.appendTo(this.$element);
    this.$content.appendTo(this.$element);

    atom.workspace.observeActivePaneItem((function(self) {
        return function(item) {
            if (item instanceof TextEditor) {
                self.$element.removeClass('hide');
            } else {
                self.$element.addClass('hide');
            }
        };
    })(this));
};

WatcherView.prototype = {
    serialize: function() {
        return {
            visible: this.visible,
            height: this.height
        };
    },

    destroy: function() {
        return this.$element.get(0).remove();
    },

    getElement: function() {
        return this.$element.get(0);
    },

    getStatusBarIcon: function() {
        return this.$statusBarIcon.get(0);
    },

    getTextColor: function() {
        return this.$titleBar.css('color');
    },

    show: function() {
        this.$element.show();
        this.$element.css({
            height: this.height + 'px'
        });

        this.$content.scrollTop(this.$content[0].scrollHeight);
        this.visible = true;

        atom.emitter.emit('atom-watcher:shown', this.$titleBar.css('color'));
    },

    hide: function() {
        this.$element.hide();
        this.visible = false;
    },

    toggle: function() {
        if (this.$element.is(':visible')) {
            this.hide();
        } else {
            this.show();
        }
    },

    setStatus: function(status) {
        switch (status) {
            case 'started':
                this.$statusBarIcon.removeClass('stopped').addClass('started').html('Watcher running');
                this.$toggleButton.removeClass('stopped').addClass('started')
                break;
            case 'stopped':
                this.$statusBarIcon.removeClass('started').addClass('stopped').html('Watcher stopped');
                this.$toggleButton.removeClass('started').addClass('stopped');
                break;
        }
    },

    appendText: function(text) {
        var $message = $('<div>');
        $message.html(text);

        $message.appendTo(this.$content);

        this.$content.css({
            height: 'calc(100% - ' + this.$titleBar.height() + 'px)'
        });

        this.$content.scrollTop(this.$content[0].scrollHeight);
    },

    clear: function() {
        this.$content.html('');
    }
};

module.exports = WatcherView;
