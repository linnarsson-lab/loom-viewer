const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
	template: path.join(__dirname + '/client/index.html'),
	filename: 'index.html',
	inject: 'body',
});

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
	],
};
