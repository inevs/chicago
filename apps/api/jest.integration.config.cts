module.exports = {
  displayName: 'api-integration',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api-integration',
  // Only run integration tests
  testMatch: ['**/*.integration.spec.ts'],
  // Don't mock Prisma for integration tests
  moduleNameMapper: {},
};
