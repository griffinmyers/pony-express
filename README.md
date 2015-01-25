# Portfolio

A portfolio for Joph.

This will be a static website backed by Dropbox for easy editing with an automated build *in the cloud*. The `/src` directly will come from Dropbox. A Dropbox webhook will hit a little web server that'll kick off a `node build.js` and then copy `/build` to S3 for serving.

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

build();
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
