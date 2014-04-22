/* jshint browser:true */
/* global require, module, goinstant, $ */

'use strict';

var _ = require('lodash');

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
  this._parseContent();
  this._labelSections();
};

Ouija.prototype._connect = function() {
  var options = {
    room: this._getIdentifier()
  };

  return goinstant.connect(this._url, options).get('rooms').get(0);
};

Ouija.prototype._getIdentifier = function() {
  if (!this._identifier) {
    return _.reject(document.location.pathname.split('/'), _.isEmpty)[0];
  }

  return 'id_' + window.ouija_identifier;
};

Ouija.prototype._parseContent = function() {
 this._el.content = $('.post-content');
 this._el.sections = _.reject(this._el.content.find('p, ol'), function(el) {
  return _($(el).text()).isEmpty();
 });
};

Ouija.prototype._labelSections = function() {
  var self = this;

  this._sections = {};

  _.each(this._el.sections, function(el, index) {
    var sectionName = 'sect_' + index;
    var $el = $(el);

    $el.data(Ouija.NAMESPACE + '-section-name', sectionName);

    self._sections[sectionName] = $(el);
  });
};