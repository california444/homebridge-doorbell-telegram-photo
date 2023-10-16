"use strict";
module.exports = {
    preset: 'ts-jest',
    testEnvironment: "node",
    coverageReporters: ["lcov"],
    collectCoverageFrom: [
        "src/**"
    ],
    verbose: true,
};
//# sourceMappingURL=jest.config.js.map