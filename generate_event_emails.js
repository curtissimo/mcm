var require = require('./lib/util/require').override(__dirname, require)
  , date = require('./lib/util/date')
  , config = require('./lib/config')
  , uuid = require('node-uuid')
  , nano = require('nano')
  , nano = nano(config.db.host)
  , rhogdb = nano.db.use('republichog')
  , now = new Date()
  , year = now.getFullYear()
  , month = now.getMonth()
  , day = now.getDate()
  , options = {
  	  key: [year, month, day]
  	, include_docs: true
  	}
  , timeout = setTimeout(function() {}, 7200)
  , exit = function() {
	  	clearTimeout(timeout);
	  }
  ;

rhogdb.view('chapter', 'eventReminders', options, function(e, result) {
	if(result.rows.length > 0) {
		var content = "<h1>Upcoming Events from Republic H.O.G.</h1><hr>"
		  , batchId = uuid.v4()
		  ;
		for(var i = 0; i < result.rows.length; i += 1) {
			var evt = result.rows[i].doc
			  , d = new Date(evt.startDate || evt.date)
			  ;
			content += '<h2><a href="http://republichog.org/chapter/events#' + evt._id + '">' + evt.title + '</a></h2>';
			if(evt.activity === 'ride' && evt.roadCaptain) {
				content += '<h3>Ride led by ' + evt.roadCaptain + '</h3>';
			}
			content += '<h3>' + d.format('m/d/yy') + ' ' + (evt.meetAt || evt.startTime || '') + '</h3>';
			content += '<b>Description</b>: ' + evt.description;
			content += '<hr>';
		}
		rhogdb.view('chapter', 'eventMailGroup', {include_docs: true}, function(e, result) {
			for(var i = 0; i < result.rows.length; i += 1) {
				var recipient = result.rows[i].doc
          , email = {
	            to: '"' + recipient.lastName + ', ' + recipient.firstName + '" <' + recipient.email + '>'
	          , from: "Activities@republichog.org"
	          , batchId: batchId
	          , subject: "Daily Republic H.O.G. Event Reminder"
	          , body: content
	          , type: 'mail'
	          , sent: new Date()
	          }
          ;
        rhogdb.insert(email);
			}
			exit();
		});
	} else {
		exit();
	}
});
