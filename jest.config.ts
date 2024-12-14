module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageReporters: ['lcov'],
  collectCoverageFrom: [
    'src/**',
  ],
  verbose: true,
  moduleDirectories: ["node_modules", "src", "dist"],
  transform: {
    "\\.[jt]sx?$": "ts-jest",
  },
  moduleNameMapper: {
    "(.+)\\.js": "$1"
  },
};