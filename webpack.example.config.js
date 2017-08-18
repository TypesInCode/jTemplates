var webpack = require('webpack');

module.exports = {  
  entry: './examples/index',
  output: {
    filename: 'jTemplate.example.js'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    loaders: [
      { test: /\.ts$/, loader: 'ts-loader' }
    ]
  },
  plugins: [
    new webpack.IgnorePlugin(/jsdom$/)
  ]
}