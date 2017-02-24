const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
	template: __dirname + '/client/index.html',
	filename: 'index.html',
	inject: 'body',
});

const uglifySettings = {
	mangle: {
		screw_ie8: true,
		keep_fnames: false,
	},
	compress: {
		warnings: false,
		hoist_funs: true,
		hoist_vars: true,
		properties: true,
		sequences: true,
		dead_code: true,
		conditionals: true,
		evaluate: true,
		booleans: true,
		unused: true,
		if_return: true,
		join_vars: true,
		cascade: true,
		collapse_vars: true,
		reduce_vars: true,
		drop_console: true,
		screw_ie8: true,
		pure_getters: true,
		keep_fargs: false,
		unsafe: true,
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
			'process.env.NODE_ENV': JSON.stringify('production')
		}),
		new webpack.optimize.UglifyJsPlugin(uglifySettings),
		HTMLWebpackPluginConfig,
	],
};