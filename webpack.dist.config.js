var webpack = require('webpack');

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
    new webpack.optimize.UglifyJsPlugin({minimize: true}),
    new webpack.IgnorePlugin(/jsdom$/)
  ]
}