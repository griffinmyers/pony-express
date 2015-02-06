# Pony Express

A build server for building & deploying static websites backed by dropbox. A Dropbox webhook will hit this little web server whenver something changes and kick off a build/deploy of the site to S3 for serving. So to recap:

* easy editing
* the cheapest to host
* the fastest response times

### Running

```bash
node app.js
curl -XPOST localhost:8080/deploy
```

### The Process (by component)

#### authorizing

`GET /authorize`

This will link the users' dropbox up with pony express. Pony will persist the user's app key in S3 so it can pull in changes as the user edits their dropbox. 

#### fetching

Set up your env:

```bash
export DROPBOX_APP_KEY=iknewyouweretroublewhenyouwalkedin
export DROPBOX_APP_SECRET=whyyougottabesomean
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

Set up your env (you don't need to do this on an EC2 instance, it can be permissioned with an instance role):

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
