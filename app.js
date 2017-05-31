var exec = require('child_process').exec;
var happierConfig = require('./happierConfig');
var happierCache = require('./happierCache');
var spawn = require('child_process').spawn;

var response = {};

var downloadQueue = [];

response.update = function () {
    for (var dependency in happierConfig.dependencies) {
        if (happierConfig.dependencies.hasOwnProperty(dependency)) {
            var version = happierConfig.dependencies[dependency];
            var cachedVersion;
            if (happierCache.cache) {
                cachedVersion = happierCache.cache[dependency];
            }
            if (cachedVersion == undefined || cachedVersion !== version) {
                response.addToDownloadQueue(dependency, version, happierConfig.repositories[dependency]);
            }
        }
    }

    response.invokeDownloadQueue();
};

response.addToDownloadQueue = function (dependency, version, repo) {
    console.log("Adding " + dependency + "#" + version);
    var depObject = {
        "name": dependency,
        "version": version,
        "repo": repo
    }
    downloadQueue.push(depObject);
};

response.invokeDownloadQueue = function () {
    if (downloadQueue.length > 0) {
        var depObject = downloadQueue[0];
        var gitClone = spawn("git clone --branch v" + depObject.version + " " + depObject.repo + " " + happierCache.destination);
        gitClone.stdout.on('data', function (data) {
            console.log('stdout: ' + data.toString());
        });

        gitClone.stderr.on('data', function (data) {
            console.log('stderr: ' + data.toString());
        });

        gitClone.on('exit', function (code) {
            console.log('child process exited with code ' + code.toString());
        });
    }
}


response.update();

module.exports = response;