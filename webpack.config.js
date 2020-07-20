const path = require('path');


module.exports = {
    mode: 'development',
    entry: {
        app: './src/index.js',
    },
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './dist',
        https: true,
        // host: '192.168.0.32',
        // port: 8080
    },
    plugins: [],
    output: {
        publicPath: "/assets/",
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.(gltf)$/,
                use: [
                    {
                        loader: "gltf-webpack-loader"
                    }
                ]
            },
            {
                test: /\.csv$/,
                loader: 'csv-loader',
                options: {
                    dynamicTyping: true,
                    skipEmptyLines: true
                }
            }
        ]
    }
};