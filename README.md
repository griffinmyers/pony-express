# Portfolio

A portfolio for my good friend and copywriter Joph.

This will be a static website backed by Dropbox for easy editing with an automated build *in the cloud*. The `/src` directory will come from Dropbox. A Dropbox webhook will hit a little web server that'll kick off a build and then copy `/build` to S3 for serving. So to recap:

* easy editing
* the cheapest to host
* the fastest response times

#### fetching

Set up your env:

```bash
export DROPBOX_ACCESS_KEY='iknewyouweretroublewhenyouwalkedin'
```

```javascript
var dropbox = require('./lib').dropbox;

dropbox.save('local_dir').then(function(result) {
  logger.info('...dancing to electro pop like a robot from 1984');
}).done();
```

#### building

```bash
node build.js
```

or for dev (watching + serving)

```bash
node build.js dev
```

or as a module

```javascript
var build = require('./build');

build('src', 'build').then(function() {
  console.log('I bet that you look good on the dance floor');
}).done();
```

#### deploying

Set up your env:

```bash
export AWS_ACCESS_KEY_ID='yougotthatlonghairslickedbackwhitetshirt'
export AWS_SECRET_ACCESS_KEY='andigotthatgoodgirlfaithandatightlittleskirt'
```

And huck those bits with the fury of an async runtime:

```javascript
var Bucket = require('./lib').Bucket;

var bucket = new Bucket('taylorswift.com');

bucket.push('1989').catch(function(reason) {
  logger.error('...and now weve got bad blood');
}).done();
```

#### running the pull/build/deploy server

```bash
node app.js
curl -XPOST localhost:8080/deploy_sync
```

#### adding a page

```markdown
---
title: About
date: 2015-01-01
---

I started out as a simple man.
```

Options for metadata are:

* `title`
* `date`
* `template`: defaults to `page`, but can also be: `layout`.

#### Markdown overview

[Markdown syntax](http://daringfireball.net/projects/markdown/syntax)

#### Oauth2.0, until I decide to implement a little site on top of this:

User goes to `https://www.dropbox.com/1/oauth2/authorize?client_id=KEY&response_type=code`, copies you the code.

```bash
curl -XPOST "https://api.dropbox.com/1/oauth2/token" -H 'application/x-www-form-urlencoded'  -d 'client_id=KEY&client_secret=SECRET9&code=CODE&grant_type=authorization_code'
```
