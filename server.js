#!/bin/env node
if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var router = express.Router();
var fs      = require('fs');
var nodemailer = require('nodemailer');


/**
 *  Define the application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP ||
                         process.env.OPENSHIFT_INTERNAL_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT   ||
                         process.env.OPENSHIFT_INTERNAL_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_*_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        // Routes for /health, /asciimo, /env and /
        self.routes['/health'] = function(req, res) {
            res.send('1');
        };

        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['/env'] = function(req, res) {
            var content = 'Version: ' + process.version + '\n<br/>\n' +
                          'Env: {<br/>\n<pre>';
            //  Add env entries.
            for (var k in process.env) {
               content += '   ' + k + ': ' + process.env[k] + '\n';
            }
            content += '}\n</pre><br/>\n'
            res.send('<html>\n' +
                     '  <head><title>Node.js Process Env</title></head>\n' +
                     '  <body>\n<br/>\n' + content + '</body>\n</html>');
        };

        self.routes['/'] = function(req, res) {
            res.set('Content-Type', 'text/html');
            res.send(self.cache_get('index.html') );
        };
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();
        self.app.use(bodyParser.json());
        self.app.use(bodyParser.urlencoded({ extended: false }));

        //CORS middleware
        var allowCrossDomain = function(req, res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type');

            next();
        }

        self.app.use(allowCrossDomain);

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
        self.app.post('/contact', handleContactForm);
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */


function handleContactForm(req, res) {
  var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  var receivers = process.env.MAIN_RECIPIENT_EMAIL;

  var source = req.body.contactsource;
  if (source === 'badlandstaxsolutions.com') {
    console.log('SHOULD add Debbi\'s email');
    // receivers += ', ' + process.env.BADLANDS_EMAIL;
  }

  var contentHoneypot = req.body.content;

  if (contentHoneypot) {
    console.error('They filled out the honeypot, must be robots!');
  }

  var plainText = 'A visitor filled out your contact form:\n';
  plainText += 'Name: ' + req.body.name;
  plainText += 'Email: ' + req.body.email;
  plainText += 'Message: ' + req.body.message;

  var html = '<h3>A visitor filled out your contact form:</h3>';
  html += '<ul>';
  html += '<li><b>Name:</b> ' + req.body.name + '</li>';
  html += '<li><b>Email:</b> ' + req.body.email + '</li>';
  html += '<li><b>Message:</b> ' + req.body.message + '</li>';
  html += '</ul>';

  // setup e-mail data with unicode symbols
  var mailOptions = {
    from: 'tsemcontact<tsemcontact@gmail.com>', // sender address
    to: receivers, // list of receivers
    subject: 'New contact message from ' + source,
    text: plainText,
    html: html
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function(error, info){
    if(error){
      return console.log(error);
    }
    console.log('Message sent: ' + info.response);
    return res.send('Message sent');
    // return res.end('hello,world\nkeesun,hi', 'UTF-8');
  });
}

/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();
