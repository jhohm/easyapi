# EasyApi

Simple RESTfull API for Node.js and connect with pluggable authentication support
Coded by Paulius Uza <pauliusuza@gmail.com> for InRuntime, based on resty for Node.JS by Alex Angelini <alex.louis.angelini@gmail.com>

## Description

EasyApi is a connect middleware which let's you build a simple REST interface for your application. I have found it especially useful when building single page web apps which need a server-side API.

The resources are all laid out in a simple directory structure which helps build a clean perspective of how people can interact with your API.

## Installation

    npm install easyapi

## Usage

Simply require the middleware and tell connect to use it:

    var connect = require('connect');
    var easyapi = require('easyapi');

    var app = connect.createServer();
    app.use(easyapi.middleware('/path/to/resources/folder', 'v1')); // accepts multiple version strings with ['v1', 'v2']
    app.listen(8080);

Remember to add middleware for authentication and file serving, as easyapi only provides the routing for the API resources.

## Resource Folder

Here is what an example resource folder may look like:

    ├─api.js
    └─v1
      ├── songs
      │   └── songs.js
      └── users
          ├── contacts
          │   └── contacts.js
          └── users.js
      

The parent tree contains a file `/api.js` containing documentation of the available API versions. The function names have to match the API versions, for example:

    exports.v1 = function v1(req, res, next) {
      res.end('these are the docs for v1');
    };

The parent tree also contains a list of folders for each version of the API. Inside each version folder, a file with the same name as the parent directory will contain the Resources methods and any subfolders are nested resources.

## Resource Method

An over-simplified user resource may look like this:

    var Users = {
      Resource: {
        get: function(uid, callback) {
          callback(null, {uid: uid, query: this.query});
        }
      },

      Collection: {
        get: function(callback) {
          callback(null, {all: 'users'});
        }
      }
    }

    module.exports = Users;

Users.Resource in v1 folder will be called if the url was `/v1/users/123` and Users.Collection will be called if the url was `/v1/users/`.

## Authentication

To add authentication include auth parameter in either Collection or Resource, like so:

    Collection: {
      auth: true,
      get: function(callback) {
        callback(null, {all: 'users'});
      }
    }

Authenticate your users using the method of your choice and set `api_auth` parameter in the Request object to true. Authentication script example:

    module.exports.apiAuth = function(req, res, next) {
      var auth_token = req.headers['x-auth-token'];
      // do your magic in isValidAuthToken function
      if(isValidAuthToken(auth_token)) {
        //if we are authenticated, set the parameter to true
        req.api_auth = true;
        next();
      } else {
        next();
      }
    }

Then enabled in the server:

    var api = connect.createServer();
    api.use(Members.apiAuth);
    api.use(easyapi.middleware(__dirname + '/api', 'v1'));
    