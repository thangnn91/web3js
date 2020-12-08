const log4js = require('log4js');
var moment = require('moment');
log4js.configure({
    appenders: { cheese: { type: 'file', filename: "_LOG/data_" + moment().format('YYYY-MM-DD') + ".log" } },
    categories: { default: { appenders: ['cheese'], level: 'ALL' } }
});
module.exports = log4js;