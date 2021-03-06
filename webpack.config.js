'use strict';
const glob = require('glob');
const path = require('path');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const webpackNodeExternals = require('webpack-node-externals');
const StatsWriterPlugin = require('webpack-stats-plugin').StatsWriterPlugin;
const baseConfig = require('./webpack.base.config');
const appConfig = require('./config');

const configs = [];

const serverConfig = webpackMerge(baseConfig, {
    output: { filename: '../[name].js', },
    entry: { server: './server' },
    target: 'node',
    externals: [webpackNodeExternals({
        whitelist: [/\.css$/],
    })],
    plugins: [
        new webpack.BannerPlugin({
            banner: 'require(\'source-map-support\').install();\n' +
                'var __webpack_dirname = __dirname;\n' +
                'var __webpack_filename = __filename;\n' +
                'var __webpack_mocha = false;\n' +
                'require(\'dotenv\').config();',
            raw: true,
            entryOnly: true,
        }),
    ],
    node: {
        __dirname: true,
        __filename: true,
    },
});
configs.push(serverConfig);

// WebUi
const webUiEntries = {};
glob.sync('webui/**/entry.{ts,tsx}', { cwd: __dirname }).forEach(filepath => {
    const name = path.dirname(filepath).replace(/[/\\]/g, '_');
    webUiEntries[name] = './' + filepath;
});
configs.push(webpackMerge(baseConfig, {
    target: 'web',
    output: {
        filename: '[name]-[chunkhash].js',
    },
    entry: webUiEntries,
    plugins: [
        new StatsWriterPlugin({
            filename: '../webui.json',
            fields: null,
            transform: (data, opts) => {
                const publicPath = data.publicPath;
                const entryPoints = {};
                for (const name in data.entrypoints) {
                    const dirname = path.normalize(path.dirname(webUiEntries[name]));
                    entryPoints[dirname] = data.entrypoints[name].assets
                        .map(x => path.join(publicPath, x));
                }
                return JSON.stringify(entryPoints);
            },
        }),
    ],
}));

module.exports = configs;
