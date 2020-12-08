var express = require('express');
var app = express();
// var cors = require('cors');
// const corsOptions = {
//     origin: ['http://localhost:8081', 'http://localhost:3001'],
//     credentials: true
// }
// app.use(cors(corsOptions));
var CommonController = require('./controller/CommonController');
app.use('/', CommonController);

module.exports = app;