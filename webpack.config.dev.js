const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssoWebpackPlugin = require('csso-webpack-plugin').default;

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
			'process.env.NODE_ENV': JSON.stringify('debug'),
		}),
		new webpack.optimize.ModuleConcatenationPlugin(),
		new MiniCssExtractPlugin({
			filename: '/static/styles/[contenthash].css',
			chunkFilename: '[id].css',
			ignoreOrder: false,
		}),
		new CssoWebpackPlugin({
			restructure: false,
		}),
		new HtmlWebpackPlugin({
			template: path.join(__dirname + '/client/index.html'),
			filename: 'index.html',
			inject: 'body',
		}),
	],
};
