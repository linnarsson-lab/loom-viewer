
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
	template: __dirname + '/client/index.html',
	filename: 'index.html',
	inject: 'body',
});

const uglifySettings = {
	mangle: true,
	sourcemap: false,
	compress: {
		warnings: false,
		sequences: true,
		dead_code: true,
		conditionals: true,
		booleans: true,
		unused: true,
		if_return: true,
		join_vars: true,
		drop_console: true,
	},
	output: {
		comments: false,
	},
};

module.exports = {
	entry: {
		'/static/js/bundle': './client/loom',
	},
	output: {
		path: './python/loompy',
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
		// new webpack.optimize.DedupePlugin(),
		// new webpack.optimize.OccurenceOrderPlugin(),
		// new webpack.optimize.UglifyJsPlugin(uglifySettings),
		HTMLWebpackPluginConfig,
	],
};