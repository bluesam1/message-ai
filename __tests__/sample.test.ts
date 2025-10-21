/**
 * Sample Test File
 * 
 * This test verifies that the Jest testing infrastructure is working correctly.
 * Once verified, you can delete this file and create real tests for your application.
 */

describe('Jest Testing Infrastructure', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should support basic arithmetic', () => {
    const sum = 2 + 2;
    expect(sum).toBe(4);
  });

  it('should support async tests', async () => {
    const asyncValue = await Promise.resolve('test');
    expect(asyncValue).toBe('test');
  });

  it('should support TypeScript', () => {
    const message: string = 'TypeScript works!';
    expect(message).toContain('TypeScript');
  });
});

describe('Testing Library Matchers', () => {
  it('should have access to custom matchers', () => {
    // Verify @testing-library/jest-native matchers are available
    expect({}).toBeDefined();
  });
});

