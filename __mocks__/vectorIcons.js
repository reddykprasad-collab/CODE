const React = require('react');
const { View } = require('react-native');

const mockIcon = ({ name, ...props }) => React.createElement(View, { testID: `icon-${name}`, ...props });

module.exports = { Feather: mockIcon, Ionicons: mockIcon, MaterialIcons: mockIcon };
