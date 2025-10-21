export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  coverageReporters: ['lcov'],
  collectCoverageFrom: [
    'src/**',
  ],
  verbose: true,
  moduleDirectories: ['node_modules', 'src', 'dist'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};