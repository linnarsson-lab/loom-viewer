const path = require('path');
const webpack = require('webpack');
const MinifyPlugin = require('babel-minify-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssoWebpackPlugin = require('csso-webpack-plugin').default;

module.exports = {
	entry: {
		'/static/js/bundle': './client/loom',
	},
	output: {
		path: path.join(__dirname, './python/loom_viewer'),
		filename: '[name].[hash].js',
		sourceMapFilename: '[name].[hash].map',
	},
	optimization: {
		minimize: true
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
				   { loader: MiniCssExtractPlugin.loader }, 'css-loader',
				 ],
			},
			{
				test: /\.(png|jpg|gif)$/,
				loader: 'file-loader',
				options: {
					name: '[name]-[hash].[ext]',
					outputPath: 'static/images/',
					publicPath: '/static/images/',
				},
			},
			{
				test: /\.(svg|eot|ttf|woff|woff2)$/,
				loader: 'file-loader',
				options: {
					name: '[name]-[hash].[ext]',
					outputPath: 'static/fonts/',
					publicPath: '/static/fonts/',
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
		new MiniCssExtractPlugin({
			filename: '/static/styles/[contenthash].css',
			chunkFilename: '[id].css',
			ignoreOrder: false,
		}),
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