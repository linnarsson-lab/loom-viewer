var path = require("path");
var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var ManifestRevisionPlugin = require("manifest-revision-webpack-plugin");

module.exports = {
	entry: './',
	output: {
		path: './python/static/js',
		filename: 'bundle.min.js',
		sourceMapFilename: './bundle.map'
	},
	watch: true,
	module: {
		loaders: [
			{
				test: /\.js/,
				loader: 'babel',
				query: {
					presets: ['react', 'es2015'],
				}
			},
			{
				test: /\.css/,
				loader: 'style!css'
			},
			{
				test: /\.html/,
				loader: 'html',
			}
		]
	},
	plugins: [
		new webpack.optimize.DedupePlugin(),
		new webpack.optimize.OccurenceOrderPlugin(),
		new webpack.optimize.UglifyJsPlugin({ mangle: false, sourcemap: false}),
	],
	devtool: '#source-map'
}