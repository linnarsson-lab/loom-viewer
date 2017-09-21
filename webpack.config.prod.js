const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
				test: /\.css$/,
				use: [
					{
						loader: 'style-loader',
						options: {
							minimize: true,
							sourceMap: false,
						},
					},
					{
						loader: 'css-loader',
						options: {
							minimize: true,
							sourceMap: false,
						},
					},
				],
			},
			{
				test: /\.(png|jpg|gif)$/,
				loader: 'file-loader',
				options: {
					name: 'static/images/[name]-[hash].[ext]',
				},
			},
			{
				test: /\.(svg|eot|ttf|woff|woff2)$/,
				loader: 'file-loader',
				options: {
					name: 'static/fonts/[name]-[hash].[ext]',
				},
			},
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
	],
};