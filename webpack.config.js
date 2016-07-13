
const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
	template: __dirname + '/client/index.html',
	filename: 'index.html',
	inject: 'body',
});

module.exports = {
	entry: {
		'static/js/bundle': './client/loom',
	},
	output: {
		path: './python',
		filename: '[name].[hash].js',
	},
	module: {
		loaders: [
			{
				test: /\.js$/,
				exlude: /node_modules/,
				loader: 'babel',
				include: path.join(__dirname, 'client'),
			},
		],
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				'NODE_ENV': "'debug'",
			},
		}),
		//new webpack.optimize.DedupePlugin(),
		//new webpack.optimize.OccurenceOrderPlugin(),
		//new webpack.optimize.UglifyJsPlugin({ mangle: true, sourcemap: false }),
		HTMLWebpackPluginConfig,
	],
};