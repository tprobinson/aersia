const path = require('path');
const webpack = require('webpack');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const ModernizrWebpackPlugin = require('modernizr-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const SvgStore = require('webpack-svgstore-plugin');

const isDev = process.env.NODE_ENV === 'development';
const outDir = isDev ? '/dev' : '/dist';

let pluginConfigs;
if( isDev ) {
  const WatchIgnorePlugin = require('watch-ignore-webpack-plugin');

  pluginConfigs = [
    new WatchIgnorePlugin([
      path.resolve(__dirname, './node_modules/'),
      path.resolve(__dirname, './src/'),
      path.resolve(__dirname, './public/index.html')
    ]),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
  ];
} else {
  pluginConfigs = [
    new webpack.NoErrorsPlugin(),
    new webpack.optimize.UglifyJsPlugin()
  ];
}

// Always want these plugins
pluginConfigs = Array.concat(pluginConfigs, [
  new webpack.DefinePlugin({
    'process.env': {
      NODE_ENV: JSON.stringify('production')
    }
  }),
  new ExtractTextPlugin({
    filename: '[name].[contenthash].css',
    disable: isDev
  }),
  new HTMLWebpackPlugin({
    template: __dirname + '/html/index.html.tmpl',
    filename: 'index.html',
    inject: 'body'
  }),
  new ModernizrWebpackPlugin({
    'feature-detects': [
      'audio',
      'cookies',
      'eventlistener',
      'forcetouch',
      'fullscreen',
      'hashchange',
      'audiopreload'
    ],
    options: [
      'setClasses'
    ]
  }),
  new SvgStore({
    // svgo options
    svgoOptions: {
      plugins: [
        { removeTitle: true }
      ]
    },
    prefix: 'icon-',
    inheritviewbox: true,
    svg: {
      viewBox: '0 0 17 17',
      xmlns: 'http://www.w3.org/2000/svg'
    }
  })
]);

module.exports = {
  entry: [
    './js/app.jsx'
  ],
  output: {
    path: '.' + outDir,
    filename: 'bundle.js',
    publicPath: '/'
  },
  module: {
    loaders: [{
      test: /.jsx?$/,
      loaders: ['babel-loader'],
      exclude: /node_modules/
    }, {
      test: /\.scss$/,
      loaders: ['css-loader', 'sass-loader', 'style-loader']
    }],
    preloaders: [{
      test: /\.jsx?/,
      loader: 'import-glob'
    }, {
      test: /\.scss/,
      loader: 'import-glob'
    }]
  },
  plugins: pluginConfigs,
  // this seems to be very important?
  target: 'web'
};
