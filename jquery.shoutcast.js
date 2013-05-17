(function($){
  "use strict";
  function SHOUTcast(opt){
    this._attr = {};

    //how often to auto update
    this.playedInterval = opt.playedInterval || opt.interval ||  30000;
    this.statsInterval = opt.statsInterval || opt.interval || 5000;

    this.host = opt.host;
    this.port = parseInt(opt.port,10)||8000;
    this.stream = parseInt(opt.stream,10)||1;
    this.dataType = (opt.dataType || 'json').toLowerCase();
    if(this.dataType === 'xml'){
		this.xmlProxy = opt.xmlProxy;
	}

    this._statsinterval = null;
    this._playedinterval = null;
    this._stats = opt.stats || function(){};
    this._played = opt.played || function(){};

    this._audioElement = document.createElement('audio');
    this._canPlayAudio = !!this._audioElement.canPlayType;
  }

  /**
   * Get attributes
   * @param  {string} k the key to get e.g. songtitle [optional] - if theres no key all attributes will be returned
   * @param  {mixed} d default value if the key value is not present [optional]
   * @return {mixed}
   */
  SHOUTcast.prototype.get = function(k,d){
    return k ? ( typeof this._attr[k.toLowerCase()] !== 'undefined' ? this._attr[k.toLowerCase()] : d) : this._attr;
  };

  /**
   * Can your browser play the SHOUTCast stram?
   * @param {none}
   * @return {boolean}
   */
  SHOUTcast.prototype.canPlayStream = function(){
    return !!(this._canPlayAudio && this._audioElement.canPlayType(this.get('content')+';').replace(/no/, ''));
  };

  /**
   * Make the browser play the SHOUTCast stream
   * @param {string} jQuery selecter to append <audio> tag to
   * @return {SHOUTcast} return this for chaining.
   */
  SHOUTcast.prototype.playStream = function(container){
    if(this.onAir() && this.canPlayStream()){
		var steamURL = 'http://'+this.host+':'+this.port+this.get('streampath');

		if($('audio', container).length){
			$('audio', container).prop('src', steamURL);
		}
		else{
			$(container).append('<audio controls src="'+steamURL+'"></audio>');
		}
	}

	return this;
  };

  /**
   * Destroy the SHOUTCast <audio> tag
   * @param {string} jQuery selecter to append <audio> tag to
   * @return {SHOUTcast} return this for chaining.
   */
  SHOUTcast.prototype.stopStream = function(container){
    $('audio', container).prop('src', '');

	return this;
  };

  /**
   * Get the shoutcast stats using /stats?sid=
   * @param  {Function} fn the callback function, this will be passed the stats on success
   * @return {SHOUTcast}      return this for chaining.
   */
  SHOUTcast.prototype.stats = function(fn){
    var that = this, r,
		url = 'http://'+this.host+':'+this.port+'/stats?sid='+this.stream+(this.dataType === 'json' ? '&json=1' : '');

	if(this.dataType === 'xml'){
		url = this.xmlProxy.replace('%s', encodeURIComponent(url));
	}

    fn = fn || function(){};
    r = $.ajax({
      url : url,
      dataType : 'jsonp',
      timeout : '2000'
    });
    r.success(function(data){
        if(typeof data !== 'object' || typeof data.streamstatus === 'undefined'){
          that._status = 0;
          return;
        }
        //2 = on air, 1 = no source
        that._status = parseInt(data.streamstatus, 10) === 1 ? 2 : 1;

        that._attr = data;
        that._attr.status = that.getStatusAsText();
        //call the update method, give the raw data just incase its required
        fn.call(that,that._attr);
        that._stats(that._attr);
      });
    r.error(function(){
      that._status = 0;
      that._attr.status = that.getStatusAsText();
      fn.call(that,that._attr);
      that.stats(that._attr);
    });
    return this;
  };

  /**
   * Get the played information from /played?sid=
   * @param  {Function} fn the callback function, will be passed an array of objects on success
   * @return {SHOUTcast}      return this for chaining
   */
  SHOUTcast.prototype.played = function(fn){
    var that = this,
		url='http://'+this.host+':'+this.port+'/played?sid='+this.stream+(this.dataType === 'json' ? '&json=1' : '');

	if(this.dataType === 'xml'){
		url = this.xmlProxy.replace('%s', encodeURIComponent(url));
	}

    $.ajax({
      url : url,
      dataType : 'jsonp',
      timeout : 2000,
      success : function(data){
        if(!data instanceof Array){
         return;
        }
        fn && fn.call(that,data);
        that._played(data);
      }
    });
    return this;
  };

  /**
   * Start updating using the stats method
   * @return {SHOUTcast} return this for chaining
   */
  SHOUTcast.prototype.startStats = function(){
    this.stopStats();
    this.stats();
    this._statsinterval = setInterval($.proxy(this.stats,this),this.statsInterval);
    return this;
  };

  /**
   * Stop updating stats
   * @return {SHOUTcast} return this for chaining
   */
  SHOUTcast.prototype.stopStats = function(){
    this._statsinterval && clearInterval(this._statsinterval);
    return this;
  };

  /**
   * Start updating played information
   * @return {SHOUTcast} this for chaining
   */
  SHOUTcast.prototype.startPlayed = function(){
    this.stopPlayed();
    this.played();
    this._playedinterval = setInterval($.proxy(this.played,this),this.playedInterval);
    return this;
  };

  /**
   * Stop updating the played information
   * @return {SHOUTcast} this for chaining
   */
  SHOUTcast.prototype.stopPlayed = function(){
    this._playedinterval && clearInterval(this._playedinterval);
    return this;
  };
  /**
   * Get the SHOUTcast status based on the last stats call
   * @return {int} the status 0 = offline, 1 = no source connected, 2 = on air
   */
  SHOUTcast.prototype.getStatus = function(){
    return this._status;
  };

  SHOUTcast.prototype.getStatusAsText = function(){
    return ['Offline','Awaiting Connection','On Air'][this._status];
  };
  /**
   * Check if the SHOUTcast server is on air.
   * @return {bool} whether the server is on air or not (this means source connected)
   */
  SHOUTcast.prototype.onAir = function(){
    return this._status === 2;
  };

  /**
   * The jQuery plug
   * @param {object} opt the options to pass to the shoutcast object
   * @return { SHOUTcast} the shotucast object
   */
  $.SHOUTcast = function(opt){
    return new SHOUTcast(opt);
  };
}(window.jQuery));
