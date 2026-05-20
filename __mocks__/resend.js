const Resend = jest.fn().mockImplementation(() => ({
  emails: {
    send: jest.fn().mockResolvedValue({ id: 'mocked-email-id' }),
  },
}));

module.exports = { Resend };
