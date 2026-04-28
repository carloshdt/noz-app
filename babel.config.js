module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === 'test';
  return {
    presets: [
      [
        require('./node_modules/expo/node_modules/babel-preset-expo'),
        { jsxImportSource: 'nativewind', reanimated: !isTest },
      ],
    ],
    plugins: isTest ? [] : ['react-native-reanimated/plugin'],
  };
};
