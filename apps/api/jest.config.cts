module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
  moduleNameMapper: {
    '^../generated/prisma/client$': '<rootDir>/__mocks__/prisma-client.ts',
  },
  // Exclude integration tests by default (run them separately with test:integration)
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.spec\\.ts$'],
};
