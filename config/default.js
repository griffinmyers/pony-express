module.exports = {
  port: process.env.PORT || 3000,
  redirect_uri: 'http://localhost:3000/authorize/redirect',
  destination: 'build',
  source: 'src',
  key_bucket: 'dropbox-keys',
  users: require('./users')
};
