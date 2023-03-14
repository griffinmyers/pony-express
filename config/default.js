var path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  redirect_uri: 'http://localhost:3000/authorize/redirect',
  destination: 'build',
  source: 'src',
  root: path.resolve(__dirname, '..'),
  key_bucket: 'dropbox-keys',
  error_path: '_error/index.html',
  users: require('./users'),
  dropbox_api_origin: 'http://localhost:4000',
  dropbox_content_origin: 'http://localhost:4001',
  s3_origin: 'http://localhost:4002'
};
