module.exports = {
  port: process.env.PORT || 3000,
  destination: 'build',
  source: 'src',
  users: require('./users')
};
