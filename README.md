# Pony Express

[ponyexprss](http://ponyexprss.com/)

```
+-------------+      +----------------+      +-----------+
|             |      |                |      |           |
|   Dropbox   | +--> |  Pony Express  | +--> |   S3      |
|             |      |                |      |           |
+-------------+      +------|\----/|--+      +-----------+
|             |      |   ___| \,,/_/  |      |           |
| * Templates |      | +-__/ \/    \  |      | * HTML    |
| * Styles    |      |_+-/     ($)  \ |      | * CSS     |
| * Scripts   |      | -/    (_      \|      | * Scripts |
| * Markdown  |      | /       \_ / ==\      |           |
|             |      |         / \_ O o)     |           |
+-------------+      +-------------\==/`     +-----------+

```

A teeny server for building & deploying static websites backed by dropbox. A Dropbox webhook will hit this little web server whenever something changes and kick off a build/deploy of the site to S3 for serving. So to recap:

* easy editing
* the cheapest to host
* the fastest response times

## Live Examples

* [wgm.cool](http://wgm.cool)

### Running

```bash
$ node app.js

# In production
#
$ curl -XPOST localhost:8080/deploy

# Testing
#
$ curl -XPOST localhost:3000/deploy/sync -H 'content-type: application/json' -d '{"id": 544017}'
```

### Developing

With your `/src` folder already populated, you can run either of the two to push to S3 or service locally. Here `[dropbox-id]` is also the source folder under `/src`, i.e. `/src/[dropbox-id]`

```bash
$ node build [dropbox-id] push
$ node build [dropbox-id] dev
```

### Registering

Run the application and visit `/authorize` to get dropbox keys properly installed. 

### In Depth

* Dropbox hits Pony Express up any time there's a change to the app folder. 
* Pony Express fetches the files that have changed and rebuilds the website
* Pony Express notces which build files have been changed, added, or deleted
  and pushes those changes to S3. 
* S3 serves up the public-facing website. 
