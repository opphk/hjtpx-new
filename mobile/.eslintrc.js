module.exports = {
  "extends": ["expo", "eslint:recommended"],
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "env": {
    "browser": true,
    "node": true,
    "es2022": true
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "warn",
    "prefer-const": "error",
    "object-curly-spacing": ["error", "always"],
    "array-bracket-spacing": ["error", "never"]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
};
