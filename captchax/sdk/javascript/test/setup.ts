beforeAll(() => {
  jest.setTimeout(10000);
});

afterAll(() => {
  jest.setTimeout(5000);
});

global.fetch = jest.fn();
