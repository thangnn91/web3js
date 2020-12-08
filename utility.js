var crypto = require('crypto');
const encryptionMethod = 'AES-256-CBC';
var config = require('./config');
const secret = config.AES_KEY;
var iv = secret.substr(0, 16);
exports.aes256_encrypt = function (text) {
    var encryptor = crypto.createCipheriv(encryptionMethod, secret, iv);
    return encryptor.update(text, 'utf8', 'base64') + encryptor.final('base64');
}

exports.aes256_decrypt = function (data) {
    var decryptor = crypto.createDecipheriv(encryptionMethod, secret, iv);
    return decryptor.update(data, 'base64', 'utf8') + decryptor.final('utf8');
}