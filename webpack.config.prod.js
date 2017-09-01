const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');

const uglifySettings = {
	mangle: {
		toplevel: true,
		keep_fnames: false,
	},
	compress: {
		sequences: true,
		properties: true,
		dead_code: true,
		drop_debugger: true,
		unsafe: true,
		unsafe_math: true,
		unsafe_proto: true,
		conditionals: true,
		comparisons: true,
		evaluate: true,
		booleans: true,
		loops: true,
		unused: true,
		toplevel: true,
		hoist_funs: true,
		hoist_vars: true,
		if_return: true,
		join_vars: true,
		cascade: true,
		collapse_vars: true,
		reduce_vars: true,
		warnings: false,
		pure_getters: true,
		drop_console: true,
		keep_fargs: false,
		keep_fnames: false,
		passes: 3,
	},
};

module.exports = {
	entry: {
		'/static/js/bundle': './client/loom',
	},
	output: {
		path: path.join(__dirname, './python/loom_viewer'),
		filename: '[name].[hash].js',
		sourceMapFilename: '[name].[hash].map',
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
			'process.env.NODE_ENV': JSON.stringify('production'),
		}),
		new webpack.optimize.ModuleConcatenationPlugin(),
		new webpack.optimize.UglifyJsPlugin(uglifySettings),
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
				minify: true,
			}
		),
	],
};