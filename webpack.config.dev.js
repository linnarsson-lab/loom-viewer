const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
	template: path.join(__dirname + '/client/index.html'),
	filename: 'index.html',
	inject: 'body',
});
const OfflineHTMLWebpackPluginConfig = new HtmlWebpackPlugin({
	template: path.join(__dirname + '/client/offline.html'),
	filename: 'offline.html',
	inject: 'body',
});
const AppCachePlugin = require('appcache-webpack-plugin');

module.exports = {
	entry: {
		'/static/js/bundle': path.join(__dirname + '/client/loom'),
	},
	output: {
		path:  path.join(__dirname, './python/loom_viewer'),
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
			'process.env.NODE_ENV': JSON.stringify('debug'),
		}),
		HTMLWebpackPluginConfig,
		OfflineHTMLWebpackPluginConfig,
		new AppCachePlugin({
			cache: [
				'/',
				'static/css/bundle.min.css',
				'static/fonts/glyphicons-halflings-regular.eot',
				'static/fonts/glyphicons-halflings-regular.svg',
				'static/fonts/glyphicons-halflings-regular.ttf',
				'static/fonts/glyphicons-halflings-regular.woff',
				'static/fonts/glyphicons-halflings-regular.woff2',
				'static/img/layers-2x.png',
				'static/img/layers.png',
				'static/img/marker-icon-2x.png',
				'static/img/marker-icon.png',
				'static/img/marker-shadow.png',
			],
			fallback: ['/ offline.html', '/dataset/*/*/ offline.html'],
			exclude: ['index.html'],
			output: 'static/manifest.appcache',
		}),
	],
};
