var path = require('path');
var _ = require('lodash');

function bind_template() {
  //
  // ## bind_template
  //
  // This middleware will add template metadata to any files that don't specify
  // one. I don't want my buddy to have to know what 'jade' is or think much
  // about templates unless he really wants to, so this is a reasonable default
  // I think.
  //
  return function _bind_template(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      if(path.extname(file_name) === '.html') {
        file.template = (file.template || 'partial') + '.jade';
      }
    });
  }
}

function row() {
  //
  // ## row
  //
  // This middleware will allow many markdown files to be the rows in a layout.
  // Just add a `rows: row1, row1, row3` attribute to the metadata of a file.
  //
  return function _row(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      if(_.has(file, 'rows')) {
        file['rows'] = _.map(_.map(file['rows'].split(','), _.trim), function(row) {
          var row_file_name = path.join(path.dirname(file_name), row + '.html');
          var row_file = files[row_file_name];
          var row = {contents: files[row_file_name] && files[row_file_name].contents, two_column: false};

          if(_.has(row_file, 'left') && _.has(row_file, 'right')) {
            row = _.extend({}, row, {
              two_column: true,
              left: row_file['left'],
              right: row_file['right']
            });
          }

          delete files[row_file_name];
          return row;
        });
      }
    });
  }
}

function two_column() {
  //
  // ## two_column
  //
  // This middleware will allow 2 different markdown files to specify two
  // different columns in a layout. Just add a `left: left-page`,
  // `right: right-page` to the metadata of a file.
  //
  // Any HTML contents can be accessed via `left` and `right` in the template.
  //
  return function _two_column(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      if(_.has(file, 'left') && _.has(file, 'right')) {
        _.forEach(['left', 'right'], function(col) {
          var col_file_name = path.join(path.dirname(file_name), file[col] + '.html');
          file[col] = files[col_file_name] && files[col_file_name].contents;
          delete files[col_file_name];
        });
      }
    });
  }
}

function partial() {
  //
  // ## partial
  //
  // This middleware will take any .md file that has `partial: whatever` in the
  // meta-data and expose its contents under 'whatever'.
  //
  return function _partial(files, metalsmith) {
    var partials = {};

    _.forEach(files, function(file, file_name) {
      if(_.has(file, 'partial')) {
        partials[file.partial] = file.contents;
        delete files[file_name];
      }
    });

    _.forEach(files, function(file, file_name) {
      if(path.extname(file_name) === '.html') {
        _.extend(file, partials);
      }
    });
  }
}

function clean(p) {
  //
  // ## clean
  //
  // This middleware will delete the path passed.
  //
  return function _clean(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      if(file_name.indexOf(p) === 0) {
        delete files[file_name];
      }
    });
  }
}

function move(options) {
  //
  // ## move
  //
  // This middleware will move files in options.source to options.dest
  //
  return function _move(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      if(file_name.indexOf(options.source) === 0) {
        files[path.join(options.destination, path.relative(options.source, file_name))] = files[file_name];
        delete files[file_name];
      }
    });
  }
}

function wrap() {
  //
  // ## wrap
  //
  // This middleware will wrap any .html file's contents in
  //
  // <div class="value">
  //   *contents*
  // </div>
  //
  // if you pass a 'wrap: value' in the frontmatter.
  //
  return function _wrap(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      if(path.extname(file_name) === '.html' && _.has(file, 'wrap')) {
        var opening = Buffer('<div class="' + file.wrap + '"/>');
        var closing = Buffer('</div>');
        file.contents = Buffer.concat([opening, file.contents, closing]);
      }
    });
  }
}

function page(options) {
  //
  // ## page
  //
  // This is a paginator based on collections.
  //
  // defaults: {
  //   collection: 'posts',
  //   perPage: 3,
  //   target: 'blog',
  //   template: 'page'
  // }
  //
  // The page's entries will be exposed under the collection attribute provided.
  //
  return function _page(files, metalsmith) {
    var opts = _.extend({}, {collection: 'posts', perPage: 3, target: 'blog', template: 'page'}, options);
    var pages = _.chunk(metalsmith._metadata[opts.collection], opts.perPage);
    var page_count = _.size(pages);

    _.forEach(pages, function(page_entries, i) {
      var file = {
        template: opts.template,
        prev: i > 0 ? i : null,
        next: i < page_count - 1 ? i + 2 : null,
        contents: Buffer('')
      };

      file[opts.collection] = _.map(page_entries, _.partialRight(_.omit, 'mode', 'stats', 'next', 'previous', 'collection'));
      files[path.join(opts.target, (i === 0 ? '' : i + 1).toString(), 'index.html')] = file;
    });
  }
}

function expose(modules){
  //
  // ## expose
  //
  // Expose modules to your templates via a dictionary of keys to modules.
  //
  return function _expose(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      files[file_name] = _.extend({}, modules, file);
    });
  }
}

module.exports = {
  bind_template: bind_template,
  two_column: two_column,
  row: row,
  partial: partial,
  clean: clean,
  move: move,
  wrap: wrap,
  page: page,
  expose: expose
};
