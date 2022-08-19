const rewire = require('rewire');
const path = require('path');

// Pointing to file which we want to re-wire — this is original build script
const defaults = rewire('react-scripts/scripts/build.js');

// Getting configuration from original build script
let config = defaults.__get__('config');

// Move build result into a different folder. (should be absolute path)
//config.output.path = path.join(path.dirname(__dirname), 'build-github');

// Rename bundle path and filename, to what CSF site expects
config.output.filename = 'js/toolinit.js';

// Rename css path and filename, to what CSF load-dependencies.js expects.
// 'load-dependencies.js' is placed in public/js, and loaded by CSF site.
// It loads this specified css file, so path/filename needs to be correct.
const miniCssExtractPlugin = config.plugins.find(element => element.constructor.name === "MiniCssExtractPlugin");
miniCssExtractPlugin.options.filename = "style/csf-grapehard-v4.css"

// Disable splitting
// We need single files for loading in CSF, must avoid chunking files.
config.optimization.splitChunks = {
    cacheGroups: {
        default: false,
    },
};
config.optimization.runtimeChunk = false;