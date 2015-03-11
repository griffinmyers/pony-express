var crypto = require('crypto');
var path = require('path');
var _ = require('lodash');

module.exports = function page(options) {
  //
  // ## page
  //
  // This is a paginator based on collections.
  //
  // defaults: {
  //   collection: 'posts',
  //   perPage: 3,
  //   target: 'blog',
  //   template: 'page',
  //   permga: false
  // }
  //
  // The page's entries will be exposed under the collection attribute provided.
  //
  return function _page(files, metalsmith) {
    var opts = _.extend({}, {collection: 'posts', perPage: 3, target: 'blog', template: 'page', perma: false}, options);
    var filtered = _.reject(metalsmith._metadata[opts.collection], 'draft');
    var pages = _.chunk(filtered, opts.perPage);
    var page_count = _.size(pages);

    _.forEach(pages, function(page_entries, i) {
      var file = paged_file(opts.collection, page_entries, opts.template, opts.target, page_count, i);
      files[path.join(opts.target, (i === 0 ? '' : i + 1).toString(), 'index.html')] = file;
    });

    if(opts.perma) {
      _.forEach(metalsmith._metadata[opts.collection], function(page) {
        var file = paged_file(opts.collection, [page], opts.template, opts.target);
        files[path.join(perma_link(opts.target, page.contents), 'index.html')] = file;
      });
    }
  }
}

function paged_file(collection, entries, template, target, page_count, i) {
  var file = {
    template: template,
    prev: i > 0 ? i : null,
    next: i < page_count - 1 ? i + 2 : null,
    contents: Buffer(''),
    target: target
  };

  file[collection] = _.map(entries, function(entry) {
    return _.extend(_.omit(entry, 'mode', 'stats', 'next', 'previous', 'collection'), {
      perma_link: '/' + perma_link(target, entry.contents)
    });
  });

  return file;
}

function perma_link(target, contents) {
  var hash = crypto.createHash('sha1').update(contents).digest('hex');
  return path.join(target, 'archive', hash);
}
