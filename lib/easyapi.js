// Requires
var fs = require('fs');
var path = require('path');

// Utility Functions
var send = exports._send = function(res, response, code) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = code || 200;
  res.write(JSON.stringify(response));
  res.end();
};

var readResources = exports._readResources = function(resource_dir) {
  var i = 0;
  var resources = {};
  var level = fs.readdirSync(resource_dir);

  for (; i < level.length; i++) {
    var index = level[i];
    var folder = path.join(resource_dir, index);
    var file = path.join(folder, index + '.js');
    var stat = fs.statSync(folder);

    if (stat.isDirectory()) {
      resources[index] = readResources(folder);
      resources[index]._main = require(file);
    }
  }

  return resources;
};

var writeResponse = exports._writeResponse = function(err, obj, res) {
  if (err) {
    return send(res, err, err.statusCode || 500);
  }
  send(res, obj, obj.statusCode || 200);
};

// Middleware
exports.middleware = function resty(resource_dir, api_version) {

  var resources = {};
  if(Array.isArray(api_version)) {
    api_version.forEach(function(version) {
      resources[version] = readResources(resource_dir+'/'+version);
    })
  } else {
    resources[api_version] = readResources(resource_dir+'/'+api_version);
  }

  return function(req, res, next) {
    var i = 0;
    var collection = false;
    var method = req.method.toLowerCase();
    var current_api_version;
    var components = req.url.split('?')[0].split('/');
    components.shift();

    // Makes '/example/' and '/example' equivalent
    if(components[components.length - 1] === '') {
      components.pop();
    }

    // API Versioning
    if(Array.isArray(api_version)) {
      var version_index = api_version.indexOf(components[0]);
      if(version_index != -1) {
         current_api_version = components[0];
         components.shift();
      } else {
        return send(res, {
          error: 'Unknown API Version'
        },
        404);
      }
     } else {
      if(components[0] === api_version) {
        current_api_version = components[0];
        components.shift();
      } else {
        return send(res, {
          error: 'Unknown API Version'
        },
        404);
      }
    }

    // Documentation, place <api_version.js> under resource_dir/api_version/ with function index(req, res, next)
    if(components.length === 0) {
      var docs = require(resource_dir+'/api.js');
      return docs[current_api_version].apply(this, [req, res, next]);
    }

    var context = {
      body: req.body,
      cookies: req.cookies,
      query: req.query
    };

    var args = [];
    var resource = resources[current_api_version];

    for (; i < components.length; i += 2) {
      resource = resource[components[i]];
      if (!resource) {
        return send(res, {
          error: 'Resource Not Found'
        },
        404);
      }
      if((i + 2) > components.length) {
        collection = true;
      } else {
        args.push(components[i + 1]);
      }
    }

    if (collection) {
      resource = resource._main.Collection;
    } else {
      resource = resource._main.Resource;
    }
    
    if (!resource || ! resource[method]) {
      return send(res, {
        error: 'Method Not Found'
      },
      404);
    }

    if(resource.auth && !req.api_auth) {
      return send(res, {
        error: 'Method Requires Authentication'
      },
      401);
    }

    args.push(function(err, obj) {
      writeResponse(err, obj, res);
    });
    resource[method].apply(context, args);

  }
};

