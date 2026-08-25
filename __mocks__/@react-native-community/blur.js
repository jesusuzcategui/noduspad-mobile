const React = require('react');
const { View } = require('react-native');

function BlurView(props) {
  return React.createElement(View, props, props.children);
}

module.exports = { BlurView };
