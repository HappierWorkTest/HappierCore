var spawn = require('child_process').spawn;
var fs = require('fs-extra');

var happierConfig = require('./happierConfig');
var happierCache = require('./happierCache');


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
        var destination = happierCache.destination + "/" + depObject.name;
        response.deleteFolderRecursive(destination);
        var args = [
            "clone",
            "--branch",
            "v" + depObject.version,
            depObject.repo,
            happierCache.destination + "/" + depObject.name
        ];
        var gitClone = spawn("git", args);//"clone --branch v" + depObject.version + " " + depObject.repo + " " + happierCache.destination);
        gitClone.stdout.on('data', function (data) {
            console.log('stdout: ' + data.toString());
            response.onDownloadRepo(depObject, destination);
        });

        gitClone.stderr.on('data', function (data) {
            console.log('stderr data: ' + data.toString());
            response.onDownloadRepo(depObject, destination);
        });

        gitClone.stderr.on('error', function (error) {
            console.log('stderr Error: ' + error.toString());
        });

        gitClone.on('exit', function (code) {
            console.log('child process exited with code ' + code.toString());
        });
    }
}

response.onDownloadRepo = function (depObject, destination) {
    console.log("Destination? " + destination);
    //response.deleteFolderRecursive(destination + "/.git");
    happierCache.cache[depObject.name] = depObject.version;
    fs.writeFile('./happierCache.json', JSON.stringify(happierCache, null, 2))
        .then(() => console.log('success writing cache'))
        .catch(err => console.error(err));

    fs.copy(destination, './modules/' + depObject.name)
        .then(() => console.log('success copying ' + destination))
        .catch(err => console.error(err));

    downloadQueue.splice(0, 1);
    response.invokeDownloadQueue();
};

response.deleteFolderRecursive = function (path) {
    if (path == undefined || path === '/' || path === '' || path === ' ') {
        console.error("Don't do this");
        return;
    }
    if (fs.existsSync(path)) {
        console.log("Deleting " + path);
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                response.deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};


response.update();

module.exports = response;