# Pony Express

```
+-------------+      +----------------+      +-------------+
|             |      |                |      |             |
|   Dropbox   | +--> |  Pony Express  | +--> |     S3      |
|             |      |                |      |             |
+-------------+      +------|\----/|--+      +-------------+
|             |      |   ___| \,,/_/  |      |             |
| * Templates |      | +-__/       \  |      | * HTML      |
| * Styles    |      |_ +-/     ^   \ |      | * CSS       |
| * Scripts   |      |  -/   (_      \|      | * Scripts   |
| * Markdown  |      |  /      \_ / ==\      |             |
|             |      | /       / \_ O o)     |             |
+-------------+      +-------------\==/`     +-------------+
```

A teeny server for building & deploying static websites backed by dropbox. Your website is immediately updated when you save a file. 

* Easily edit your page by updating copy in markdown files in your dropbox. 
    - Use a convenient editor like [Ulysses](http://www.ulyssesapp.com/) with markdown and dropbox support for editing on desktop or iPad.
    - Or use something like the [Byword](https://bywordapp.com/) iPhone app when you're on the go.
* New pages are as easy as creating a new file. Your site's url scheme mimics the dropbox directory structure. 
* Cheap to host.  You're just serving up static files on S3. 
* Fast response times. It's a static site so use the AWS CDN for supreme speeds.
* Baked-in blog infrastructure. 

## Live Examples

* [wgm.cool](http://wgm.cool)
* [joeshaner.com](http://joeshaner.com)
* [fallcreekfarm.org](http://fallcreekfarm.org)
* [ramblinrunner.com](http://ramblinrunner.com/)
* [cragcation.com](http://cragcation.com/)
* [brandonkreitler.com](http://brandonkreitler.com/)

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
* Pony Express notices which build files have been changed, added, or deleted
  and pushes those changes to S3. 
* S3 serves up the public-facing website. 

### Releasing

* `npm test`
* `npm run lint`
* `git tag x.y.z`
* `git push --tags`
* `eb deploy -l x.y.z`

### Contributing

* Fork
* Edit
* Write test
* Run tests `npm test`
* PR
