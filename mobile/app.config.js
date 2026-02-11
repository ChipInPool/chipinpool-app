export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      apiUrl: process.env.API_URL || 'https://chipinpool-csekdvghcqepcthm.centralus-01.azurewebsites.net',
    },
  };
};
