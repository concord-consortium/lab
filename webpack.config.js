const path = require("path");
const webpack = require("webpack");

/*
 * SplitChunksPlugin is enabled by default and replaced
 * deprecated CommonsChunkPlugin. It automatically identifies modules which
 * should be splitted of chunk by heuristics using module duplication count and
 * module category (i. e. node_modules). And splits the chunks…
 *
 * It is safe to remove "splitChunks" from the generated configuration
 * and was added as an educational example.
 *
 * https://webpack.js.org/plugins/split-chunks-plugin/
 *
 */

/*
 * We've enabled MiniCssExtractPlugin for you. This allows your app to
 * use css modules that will be moved into a separate CSS file instead of inside
 * one of your module entries!
 *
 * https://github.com/webpack-contrib/mini-css-extract-plugin
 *
 */

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

/*
 * We've enabled TerserPlugin for you! This minifies your app
 * in order to load faster and run less javascript.
 *
 * https://github.com/webpack-contrib/terser-webpack-plugin
 *
 */

const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: "development",
  entry: {
    "lab": "./src/lab/index.js",
    "lab.min": "./src/lab/index.js",
    "lab.mml-converter": "./src/lab/mml-converter/index.js",
    "lab.mml-converter.min": "./src/lab/mml-converter/index.js",
    "lab.grapher": "./src/lab/grapher/index.js",
    "lab.grapher.min": "./src/lab/grapher/index.js"
  },
  output: {
    path: path.resolve(__dirname, 'public', 'lab'),
    chunkFilename: "[name].js"
  },
  devtool: "source-map",
  plugins: [
    new webpack.ProgressPlugin(),
    new MiniCssExtractPlugin({filename: "lab.css"})
  ],
  module: {
    rules: [
      {
        test: /.(js|jsx)$/,
        include: [path.resolve(__dirname, "src/lab")],
        loader: "babel-loader"
      },
      {
        test: /.(glsl|tpl)$/,
        include: [path.resolve(__dirname, "src/lab")],
        loader: "raw-loader"
      },
      {
        test: /.(scss|css|sass)$/,

        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader",

            options: {
              sourceMap: true
            }
          },
          {
            loader: "sass-loader",

            options: {
              sourceMap: true
            }
          }
        ]
      }
    ]
  },
  resolve: {
    modules: [path.resolve(__dirname, './src/lab'), 'node_modules'],
    alias: {
      'lab-grapher': path.resolve(__dirname, 'vendor/lab-grapher/dist/lab-grapher'),
      'i18next': path.resolve(__dirname, 'vendor/i18next/i18next.js'),
      'sensor-applet': path.resolve(__dirname, 'vendor/lab-sensor-applet-interface-dist/sensor-applet-interface'),
      'sensor-connector-interface':  path.resolve(__dirname, 'vendor/sensor-connector-interface/dist/sensor-connector-interface'),
      'labquest2-interface': path.resolve(__dirname, 'vendor/sensor-labquest-2-interface/dist/sensor-labquest-2-interface')
    }
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      test: /\.min\.js$/i,
    })],
    splitChunks: {
      cacheGroups: {
        vendors: {
          priority: -10,
          test: /[\\/]node_modules[\\/]/
        }
      },
      chunks: "async",
      minChunks: 1,
      minSize: 30000,
      name: true
    }
  }
};
