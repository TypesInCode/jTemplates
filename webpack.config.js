var webpack = require('webpack');

module.exports = {  
  entry: './src/web',
  output: {
    filename: './lib/jTemplates.js',
    /* libraryTarget: 'var',
    library: 'jTemplate' */
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