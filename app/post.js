/* jshint browser:true */
/* global require, module */

'use strict';

/**
 * @fileOverview
 *
 * This file should contain a Post model, except... it's a mess
 **/

var _ = require('lodash');
var Q = require('q');
var Emitter = require('emitter-component');

Q.longStackSupport = true; // TODO: Remove in Beta

module.exports = Post;

/**
 * The Post class abstracts retrieving and adding the comments associated
 * with a single Ghost article
 *
 * @public
 * @class
 * @constructor
 * @param {int} identifier - Post UID
 * @param {Deferred} connection - GoInstant connection promise
 * @param {Object} users - Users instance
 */
function Post(identifier, connection, users) {
  _.extend(this, {
    _identifier: identifier,
    _postRoom: connection.get('rooms').get(1).invoke('join').get('room'),
    _comments: {},
    _users: users,
    _cached: Q.defer()
  });

  this._initialize();
}

Emitter(Post.prototype);

Post.prototype._initialize = function() {
  this._fetchComments();
  this._observeChanges();
};

Post.prototype._fetchComments = function() {
  this._postRoom
    .invoke('key', '/sections')
    .invoke('get')
    .get('value')
    .then(this._getUsers.bind(this))
    .then(this._cacheComments.bind(this))
    .then(this._cached.resolve)
    .fail(this._cached.reject);
};

// TODO: add set/remove handlers
Post.prototype._observeChanges = function() {
  var options = { bubble: true, local: true };
  var futureKey = this._postRoom.invoke('key', '/sections');

  futureKey.invoke('on', 'add', options, this._addHandler.bind(this));
};

Post.prototype._addHandler = function(comment, context) {
  var self = this;

  var sectionName = _.last(context.key.split('/'));
  var commentId = _.last(context.addedKey.split('/'));

  this._comments[sectionName] = this._comments[sectionName] || {};
  this._users.getUser(comment.userId).then(function(user) {
    comment.displayName = user.displayName;
    comment.avatarUrl = user.avatarUrl;
    comment.username = user.username;

    self._comments[sectionName][commentId] = comment;
    self.emit('newComment', sectionName);
  });
};

Post.prototype._getUsers = function(sections) {
  var self = this;

  var deferred = Q.defer();
  var promises = [];

  _(sections).each(function(comments) {
    _(comments).each(function(comment) {
      var promise = self._users.getUser(comment.userId);
      promise.then(function(user) {

        comment.displayName = user.displayName;
        comment.avatarUrl = user.avatarUrl;
        comment.username = user.username;
      });

      promises.push(promise);
    });

  });

  Q.all(promises).then(function() {
    deferred.resolve(sections);
  });

  return deferred.promise;
};

Post.prototype._cacheComments = function(sections) {
  var self = this;

  _(sections).each(function(comments, sectionName) {
    self._comments[sectionName] = _.reduce(comments, function(o, comment, id) {
      comment.id = id;
      o[id] = comment;

      return o;
    }, {});
  });

  return this._comments;
};

Post.prototype.add = function(sectionName, comment) {
  var self = this;

  var deferred = Q.defer();
  var keyName = 'sections/' + sectionName;

  this._users.getSelf().then(function(localUser) {
    comment.userId = localUser.id;

    self._postRoom
      .invoke('key', keyName)
      .invoke('add', comment)
      .then(deferred.resolve)
      .fail(deferred.reject);
  });

  return deferred.promise;
};

Post.prototype.getComments = function(sectionName) {
  var self = this;

  return this._cached.promise.then(function() {
    return _.sortBy(self._comments[sectionName], 'id') || null;
  });
};
