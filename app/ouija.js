/* jshint browser:true */
/* global require, module, goinstant */

'use strict';

var _ = require('lodash');
var Post = require('./post');
var Users = require('./users');
var CommentView = require('./view');

module.exports = Ouija;

function Ouija(config) {
  _.extend(this, {
    _url: config.connect_url,
    _identifier: config.identifier,
    _el: {}
  });
}

Ouija.NAMESPACE = 'ouija';

Ouija.prototype.initialize = function() {
  this._connection = this._connect();
  this._users = new Users(this._connection);
  this._post = new Post(this._identifier, this._connection, this._users);
  this._view = new CommentView(this._post, this._users); // TODO: not this

  this._observePost();
};

Ouija.prototype._observePost = function() {
  this._post.on('newComment', this._view.add);
};

Ouija.prototype._connect = function() {
  var options = {
    room: ['lobby', this._getIdentifier()]
  };

  return goinstant.connect(this._url, options);
};

Ouija.prototype._getIdentifier = function() {
  if (!this._identifier) {
    return _.reject(document.location.pathname.split('/'), _.isEmpty)[0];
  }

  return 'post_' + window.ouija_identifier;
};