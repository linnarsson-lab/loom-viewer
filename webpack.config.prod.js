const path = require('path');
const webpack = require('webpack');
const MinifyPlugin = require('babel-minify-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CssoWebpackPlugin = require('csso-webpack-plugin').default;

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
		rules: [
			{
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
					fallback: 'style-loader',
					use: 'css-loader',
				}),
			},
			{
				test: /\.(png|jpg|gif)$/,
				loader: 'file-loader',
				options: {
					name: '[name]-[hash].[ext]',
					outputPath: 'static/',
					publicPath: '/',
				},
			},
			{
				test: /\.(svg|eot|ttf|woff|woff2)$/,
				loader: 'file-loader',
				options: {
					name: '[name]-[hash].[ext]',
					outputPath: 'static/',
					publicPath: '/',
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
		new MinifyPlugin({
			booleans: false,
			mangle: {
				topLevel: true,
			},
			removeConsole: true,
			removeDebugger: true,
		}),
		new webpack.optimize.ModuleConcatenationPlugin(),
		new webpack.optimize.UglifyJsPlugin(uglifySettings),
		new ExtractTextPlugin('/static/styles-[contenthash].css'),
		new CssoWebpackPlugin({
			restructure: true,
			forceMediaMerge: true,
		}),
		new HtmlWebpackPlugin({
			template: path.join(__dirname + '/client/index.html'),
			filename: 'index.html',
			inject: 'body',
		}),
	],
};