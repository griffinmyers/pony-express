module.exports = {
  port: process.env.PORT || 80,
  redirect_uri: 'https://ponyexprss.com/authorize/redirect',
  dropbox_api_origin: 'https://api.dropboxapi.com',
  dropbox_content_origin: 'https://content.dropboxapi.com',
  s3_origin: null // use hostname based URLs in production
}
