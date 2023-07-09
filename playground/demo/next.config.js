// @react-libs/modal 패키지를 tranpile 시킨다.
const withTM = require("next-transpile-modules")(["@react-libs/modal"]);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.css$/,
      use: ["style-loader", "css-loader", "postcss-loader"],
    });

    return config;
  },
};

module.exports = withTM(nextConfig);
