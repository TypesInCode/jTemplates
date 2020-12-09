const webpack = require('webpack');
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/web',
  output: {
    filename: 'jTemplates.js',
    path: path.resolve(__dirname, 'lib')
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      { 
        test: /\.ts$/, 
        loader: 'ts-loader'
      }
    ]
  },
  plugins: [
    new webpack.IgnorePlugin(/jsdom/)
  ]
}