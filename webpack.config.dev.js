const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');

// webpack needs the trailing slash for output.publicPath
const PUBLIC_PATH = 'http://localhost:8003/';

module.exports = {
	entry: {
		'/static/js/bundle': path.join(__dirname + '/client/loom'),
	},
	output: {
		path: path.join(__dirname, './python/loom_viewer'),
		filename: '[name].[hash].js',
		sourceMapFilename: '[name].[hash].map',
		publicPath: PUBLIC_PATH,
	},
	module: {
		loaders: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				loader: 'babel-loader',
				include: path.join(__dirname, 'client'),
			},
		],
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify('debug'),
		}),
		new HtmlWebpackPlugin({
			template: path.join(__dirname + '/client/index.html'),
			filename: 'index.html',
			inject: 'body',
		}),
		new SWPrecacheWebpackPlugin(
			{
				cacheId: 'loom-offline-cache',
				dontCacheBustUrlsMatching: /\.\w{8}\./,
				staticFileGlobsIgnorePatterns: [/\.map$/, /asset-manifest\.json$/],
				staticFileGlobs: [
					'./python/loom_viewer/static/**/*.*',
				],
				maximumFileSizeToCacheInBytes: 8<<20,
				stripPrefix: './python/loom_viewer', // stripPrefixMulti is also supported
				mergeStaticsConfig: true, // if you don't set this to true, you won't see any webpack-emitted assets in your serviceworker config
				filename: 'service-worker.js',
				navigateFallback: 'index.html',
				navigateFallbackWhitelist: [ '/', /^\/dataset\//],
			}
		),
	],
};
