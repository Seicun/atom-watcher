// Define your commands. They can be either a string or a function returning a string.
// If such a function doesn't return a string, no command will be executed.

var ftp = {
    name: 'Upload html files on change via NcFTP',
    command: function(event, file) {
        if (event === 'change' && file.match(/\.html$/)) {
            return 'ncftpput -u user -p password ftp.server.com /srv/http/project "' + file + '"';
        }
    }
};

var rsync = {
    name: 'Rsync on changes',
    command: 'rsync -aP --exclude "node_modules" "./" "server:/path/to/destination"'
};

var sass = {
    command: 'sass --watch css'
};

var config = {
    directory: '.', // The directory which will be watched for changes. If falsy, the parent directory of this module will be watched.
    ignore: [ // ignore can be a string, regex, function or an array containing any of them. Has to be anymatch compatible, see https://github.com/es128/anymatch
        /node_modules/,
        /\.git/
    ],
    delay: 1000,
    verbosity: 'normal', // Possible values are: minimal, normal, verbose
    commandsOnStart: [
        sass
    ],
    commandsOnChange: [
        rsync
    ],
    commandsOnEnd: [

    ]
};

module.exports = config;
