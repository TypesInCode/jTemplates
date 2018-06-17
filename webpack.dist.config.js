var webpack = require('webpack');
var Uglify = require('uglifyjs-webpack-plugin');

module.exports = {  
  entry: './src/index',
  output: {
    filename: 'jTemplate.js'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    loaders: [
      { test: /\.ts$/, loader: 'ts-loader' }
    ]
  },
  plugins: [
    // new webpack.optimize.UglifyJsPlugin({minimize: true}),
    new Uglify(),
    new webpack.IgnorePlugin(/jsdom$/)
  ]
}