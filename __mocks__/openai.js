// Jest manual mock for the openai package.
// Auto-applied via moduleNameMapper in package.json.
// Tests that need to configure the AI response use:
//   const OpenAI = require('openai');
//   OpenAI.__mockCreate.mockResolvedValue({ choices: [{ message: { content: '...' } }] });

const mockCreate = jest.fn().mockResolvedValue({
  choices: [{ message: { content: '{}' } }],
});

const MockOpenAI = jest.fn().mockImplementation(() => ({
  chat: {
    completions: {
      create: mockCreate,
    },
  },
}));

MockOpenAI.__mockCreate = mockCreate;

module.exports = MockOpenAI;
