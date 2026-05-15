module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/captchax', '<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    'src/**/*.jsx',
    'captchax/**/*.js',
    '!src/**/*.test.js',
    '!captchax/**/*.test.js',
    'src/**/__tests__/**',
    '!src/**/node_modules/**',
    '!captchax/**/node_modules/**'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^config/database/db$': '<rootDir>/tests/__mocks__/database.js',
    '^src/config/database/db$': '<rootDir>/tests/__mocks__/database.js',
    '^backend/config/database/db$': '<rootDir>/tests/__mocks__/database.js',
    '^src/backend/config/database/db$': '<rootDir>/tests/__mocks__/database.js',
    '^../../config/database/db$': '<rootDir>/tests/__mocks__/database.js',
    '^../config/database/db$': '<rootDir>/tests/__mocks__/database.js',
    '^../../../config/database/db$': '<rootDir>/tests/__mocks__/database.js',
    '^config/redis/client$': '<rootDir>/tests/__mocks__/redis.js',
    '^src/config/redis/client$': '<rootDir>/tests/__mocks__/redis.js',
    '^../../../config/redis/client$': '<rootDir>/tests/__mocks__/redis.js',
    '^../../config/redis/client$': '<rootDir>/tests/__mocks__/redis.js',
    '^../config/redis/client$': '<rootDir>/tests/__mocks__/redis.js',
    '^backend/config/redis/client$': '<rootDir>/tests/__mocks__/redis.js',
    '^src/backend/config/redis/client$': '<rootDir>/tests/__mocks__/redis.js'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  clearMocks: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover', 'json-summary', 'json'],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 45,
      lines: 50,
      statements: 50
    },
    './src/utils/': {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70
    },
    './src/models/': {
      branches: 50,
      functions: 55,
      lines: 60,
      statements: 60
    }
  },
  testPathIgnorePatterns: ['/node_modules/', '/frontend/node_modules/'],
  verbose: true,
  modulePathIgnorePatterns: ['<rootDir>/src/config/database/db.js'],
  testTimeout: 10000
};
