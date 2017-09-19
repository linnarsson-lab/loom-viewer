const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
				test: /\.css$/,
				use: [
					'style-loader',
					'css-loader',
				],
			},
			{
				test: /\.(png|jpg|gif)$/,
				loader: 'file-loader',
				options: {
					publicPath: PUBLIC_PATH,
					name: 'static/images/[name]-[hash].[ext]',
				},
			},
			{
				test: /\.(svg|eot|ttf|woff|woff2)$/,
				loader: 'file-loader',
				options: {
					publicPath: PUBLIC_PATH,
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
			'process.env.NODE_ENV': JSON.stringify('debug'),
		}),
		new HtmlWebpackPlugin({
			template: path.join(__dirname + '/client/index.html'),
			filename: 'index.html',
			inject: 'body',
		}),
	],
};
