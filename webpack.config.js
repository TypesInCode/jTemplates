var webpack = require('webpack');

module.exports = {  
  entry: './src/index',
  output: {
    filename: 'jTemplate.js'
  },
  //devtool: 'source-map',
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