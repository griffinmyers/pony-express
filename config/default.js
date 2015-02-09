module.exports = {
  port: process.env.PORT || 3000,
  redirect_uri: 'https://ponyexprss.com/authorize/redirect',
  destination: 'build',
  source: 'src',
  key_bucket: 'dropbox-keys',
  users: require('./users')
};
