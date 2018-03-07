const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CssoWebpackPlugin = require('csso-webpack-plugin').default;
const OfflinePlugin = require('offline-plugin');

module.exports = {
	entry: {
		'/static/js/bundle': path.join(__dirname + '/client/loom'),
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
			'process.env.NODE_ENV': JSON.stringify('debug'),
		}),
		new webpack.optimize.ModuleConcatenationPlugin(),
		new ExtractTextPlugin('/static/styles/[contenthash].css'),
		new CssoWebpackPlugin({
			restructure: false,
		}),
		new HtmlWebpackPlugin({
			template: path.join(__dirname + '/client/index.html'),
			filename: 'index.html',
			inject: 'body',
		}),
		new OfflinePlugin({
			appShell: '/',
			caches: 'all',
			excludes: ['/loom/*', '/clone/*'],
			ServiceWorker: {
				events: true,
			},
			cacheMaps: [
				{
					match: (requestUrl) => {
						// /loom and /clone are API endpoints.
						// Everything else should go through to the server
						return (
							requestUrl.pathname.startsWith('/loom') ||
							requestUrl.pathname.startsWith('/clone')
						) ? requestUrl :
							new URL('/', location);
					},
					requestTypes: ['navigate', 'same-origin'],
				},
			],
		}),
	],
};
