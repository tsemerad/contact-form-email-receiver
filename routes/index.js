var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');
var logger = require('morgan');


router.post('/', handleContactForm);

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

module.exports = router;
