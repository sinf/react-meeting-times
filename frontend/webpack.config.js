// vim: set shiftwidth=2 tabstop=2 expandtab:
const path = require('path');
const webpack = require('webpack');

module.exports = (env) => {
  console.log("BACKEND_URL:", env.BACKEND_URL);
  console.log("FRONTEND_URL:", env.FRONTEND_URL);
  const x =
{
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
  },
  //devtool: 'inline-source-map',
  resolve: {
    modules: [path.join(__dirname, 'src'), 'node_modules'],
    alias: {
      react: path.join(__dirname, 'node_modules', 'react'),
    },
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
        },
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      process: {
        env: {
          BACKEND_URL: env.BACKEND_URL,
          FRONTEND_URL: env.FRONTEND_URL,
        }
      }
    })
  ]
};
  return x;
};

