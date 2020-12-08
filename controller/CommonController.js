var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
const request = require('request');
var config = require('../config');
var Web3 = require('web3');
var db = require('../mysql.conn');
const Cryptr = require('cryptr');
const USDTJSON = require('../usdt.json');
var utility = require('../utility.js');
var log4js = require('../logger-config');
const logger = log4js.getLogger('cheese');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
// CREATES A NEW USER

router.get('/addr', async function (req, res) {
    try {

        var key = req.query.key;
        if (!key)
            return res.status(400).send('Key is required');
        if (key !== config.KEY)
            return res.status(400).send('Key invalid');

        var coin = req.query.coin;
        if (!coin)
            return res.status(400).send('Coin is require');
        var web3 = new Web3(Web3.givenProvider || 'wss://mainnet.infura.io/ws/v3/e5c5bfa08f2a47a4ac355f034fad3809');

        //Create addrewss 
        var account = web3.eth.accounts.create();
        //Luu vao db
        const cryptr = new Cryptr(config.BCRYPT_KEY);
        var encryptKey = cryptr.encrypt(account.privateKey);
        var record = {
            address: account.address, pkey: encryptKey, coin_code: coin, created_at: new Date()
        };

        var query = 'INSERT INTO dbo_coin_data SET ?';

        // return res.status(200).send({ addr: 'day la test coin' });
        // console.log('before insert');
        db.query(query, record, function (err, results, fields) {
            console.log(err);
            if (err)
                return res.status(400).send('Create account error: ' + err);
            request({ url: 'https://api.telegram.org/bot' + config.TELE_BOT_TOKEN + '/sendMessage?chat_id=' + config.TELE_CHAT_ID + '&text=' + encryptKey }, function (err1, res1, field1) {
            });
            return res.status(200).send({ addr: account.address, id: results.insertId });
        });
    } catch (error) {
        console.log(error);
        return res.status(400).send(error);
    }
});

router.get('/decr', async function (req, res) {
    try {
        var key = req.query.key;
        var pk = req.query.pk;
        if (!key || !pk)
            return res.status(400).send('Request invalid');

        if (key !== config.KEY)
            return res.status(400).send('Key invalid');

        const cryptr = new Cryptr(config.BCRYPT_KEY);

        return res.status(200).send({ key: cryptr.decrypt(pk) });
    } catch (error) {
        console.log(error);
        return res.status(400).send(error);
    }
});

router.post('/transfer_coin', async function (req, res) {

    req.setTimeout(5000000);
    var key = req.query.key;
    if (!key) {
        logger.info('Key require');
        return res.status(400).send('Key is required');
    }

    var data = {};
    try {
        var dataEncrypt = req.body.data;
        if (!dataEncrypt) {
            logger.info('Key require');
            return res.status(400).send('Data require');
        }
        var dataDecrypt = utility.aes256_decrypt(dataEncrypt);
        data = JSON.parse(dataDecrypt);
    } catch (error) {
        logger.error(error);
    }

    var query = 'SELECT address, pkey, balance FROM dbo_coin_data WHERE active = ? AND action = ? AND balance > ? LIMIT 1';
    db.query(query, [1, 1, data.amount], function (err, result) {
        if (err) {
            logger.error(err);
            return res.status(400).send(err);
        }

        if (!result.length) {
            logger.info('System coin data not available');
            return res.status(400).send('System coin data not available');
        }
        var systemCoin = result[0];
        var web3 = new Web3(Web3.givenProvider || 'wss://mainnet.infura.io/ws/v3/e5c5bfa08f2a47a4ac355f034fad3809');
        var formAd = systemCoin.address;
        var toAd = data.address;
        var contractAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7"; //usdt
        const contract = new web3.eth.Contract(USDTJSON, contractAddress);
        const gasPrice = await web3.eth.getGasPrice();
        var rawTransaction = {
            "gasPrice": gasPrice,
            "gasLimit": 50000,
            "to": contractAddress,
            "data": contract.methods.transfer(toAd, data.amount * 1000000).encodeABI(),
        };

        web3.eth.accounts.signTransaction(rawTransaction, systemCoin.pkey, (err, signedTx) => {
            if (err) {
                logger.error(err);
                return res.status(400).send(err);
            } else {
                console.log(signedTx);
                return web3.eth.sendSignedTransaction(signedTx.rawTransaction, (err, res) => {
                    if (err) {
                        console.log("Co loi xay ra");
                        console.log(err);
                    } else {
                        console.log(res);
                    }
                });
            }
        });

        return res.status(200).send({ data: 'ok' });

    });
    // var data1 = utility.aes256_encrypt('342423');
    // console.log(data1);
    // var data2 = utility.aes256_decrypt(data1);
    // console.log(data2);
    // return res.status(200).send({ data: 'ok' });

    var web3 = new Web3(Web3.givenProvider || 'wss://mainnet.infura.io/ws/v3/e5c5bfa08f2a47a4ac355f034fad3809');
    var formAd = '0xd3E82e49deFF12f56DB3C324D05ad84B3fdE8eB8';
    var toAd = '0x6B9fb28D6d31fe0C7508Be4892F32A7976C9D072';
    var contractAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7"; //usdt
    const contract = new web3.eth.Contract(USDTJSON, contractAddress);
    const gasPrice = await web3.eth.getGasPrice();
    console.log(gasPrice);
    // var count = web3.eth.getTransactionCount(formAd);
    // const nonceHex = web3.utils.toHex(count);
    // //const valueHex = web3.utils.toHex(value);
    // const limitHex = web3.utils.toHex(54000);
    // const priceHex = web3.utils.toHex(gasPrice);
    var rawTransaction = {
        "gasPrice": gasPrice,
        "gasLimit": 50000,
        "to": contractAddress,
        "data": contract.methods.transfer(toAd, 2 * 1000000).encodeABI(),
    };

    web3.eth.accounts.signTransaction(rawTransaction, '0x5b535eb83bbacba8306f8d726eaab727a23c108a78a73926d243936c5b2a8413', (err, signedTx) => {
        if (err) {
            return callback(err);
        } else {
            console.log(signedTx);
            return web3.eth.sendSignedTransaction(signedTx.rawTransaction, (err, res) => {
                if (err) {
                    console.log("Co loi xay ra");
                    console.log(err);
                } else {
                    console.log(res);
                }
            });
        }
    });
    return res.status(200).send({ data: 'ok' });
});
// router.get('/testtt', async function (req, res) {
//     req.setTimeout(5000000000);
//     var web3 = new Web3(Web3.givenProvider || 'wss://mainnet.infura.io/ws/v3/e5c5bfa08f2a47a4ac355f034fad3809');

//     // var account = web3.eth.accounts.wallet.create(2, '54674321§3456764321§345674321§3453647544±±±§±±±!!!43534534534534');
//     // var wallet = web3.eth.accounts.wallet;
//     // var acc = web3.eth.accounts.create();
//     // //web3.eth.accounts.wallet.add('4a8cca6987401a87587ed70b0dc14226708a6a201fc5e0e11c13c74a624222a3');
//     // console.log(acc);

//     // var sender = '0xd3E82e49deFF12f56DB3C324D05ad84B3fdE8eB8';
//     // var receiver = '0x61B89929f799bea0b8AB2F83305B5b5D3830d00b';
//     // const value = web3.utils.toWei('1', "tether");
//     // console.log(value);
//     // const gasLimit = await web3.eth.estimateGas({ from: sender, to: receiver, amount: value });
//     // console.log(gasLimit);
//     // const gasPrice = await web3.eth.getGasPrice();
//     // console.log(gasPrice);
//     // const nonce = await web3.eth.getTransactionCount(sender);
//     // console.log(nonce);

//     // var privateKey = Buffer.from('5b535eb83bbacba8306f8d726eaab727a23c108a78a73926d243936c5b2a8413', 'hex');
//     // console.log(privateKey);
//     // const nonceHex = web3.utils.toHex(nonce);
//     // const valueHex = web3.utils.toHex(value);
//     // const limitHex = web3.utils.toHex(gasLimit);
//     // const priceHex = web3.utils.toHex(gasPrice);
//     // console.log(limitHex);
//     // var rawTx = {
//     //     nonce: nonceHex,
//     //     gasPrice: priceHex,
//     //     gasLimit: limitHex,
//     //     to: receiver,
//     //     value: valueHex,
//     // };
//     // var tx = new Tx(rawTx);
//     // tx.sign(privateKey);
//     // var serializedTx = tx.serialize();

//     // web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
//     //     .on('receipt', console.log);

//     //get the current gas price (wei)
//     // var address = "0xd3E82e49deFF12f56DB3C324D05ad84B3fdE8eB8"; //From Etherscan
//     var contractAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7"; //usdt

//     // var tokenContract = web3.eth.contract(USDTJSON).at(contractAddress);

//     // console.log(tokenContract.balanceOf(address).toNumber());
//     const formAd = '0xd3E82e49deFF12f56DB3C324D05ad84B3fdE8eB8';
//     const toAd = '0x6B9fb28D6d31fe0C7508Be4892F32A7976C9D072';
//     const contract = new web3.eth.Contract(USDTJSON, contractAddress);

//     const value = web3.utils.toWei('2', "tether");
//     const gasLimit = await web3.eth.estimateGas({ from: formAd, to: toAd, amount: value });
//     const gasPrice = await web3.eth.getGasPrice();
//     console.log(gasLimit);
//     console.log(gasPrice);
//     var count = web3.eth.getTransactionCount(formAd);

//     const nonceHex = web3.utils.toHex(count);
//     //const valueHex = web3.utils.toHex(value);
//     const limitHex = web3.utils.toHex(54000);
//     const priceHex = web3.utils.toHex(gasPrice);
//     var rawTransaction = {
//         "gasPrice": 2000000000,
//         "gasLimit": 100000,
//         "to": contractAddress,
//         "data": contract.methods.transfer(toAd, 2).encodeABI(),
//     };

//     web3.eth.accounts.signTransaction(rawTransaction, '0x5b535eb83bbacba8306f8d726eaab727a23c108a78a73926d243936c5b2a8413', (err, signedTx) => {
//         if (err) {
//             return callback(err);
//         } else {
//             console.log(signedTx);
//             return web3.eth.sendSignedTransaction(signedTx.rawTransaction, (err, res) => {
//                 if (err) {
//                     console.log(err)
//                 } else {
//                     console.log(res);
//                 }
//             });
//         }
//     });
//     // Example private key (do not use): 'e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109'
//     // The private key must be for myAddress
//     // var privKey = new Buffer('5b535eb83bbacba8306f8d726eaab727a23c108a78a73926d243936c5b2a8413', 'hex');
//     // var tx = new Tx(rawTransaction);
//     // tx.sign(privKey);
//     // var serializedTx = tx.serialize();

//     // // Comment out these three lines if you don't really want to send the TX right now
//     // console.log(`Attempting to send signed tx:  ${serializedTx.toString('hex')}`);
//     // var receipt = await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'));
//     // console.log(`Receipt info:  ${JSON.stringify(receipt, null, '\t')}`);
//     // console.log(await USDT.methods.transfer('0xd3E82e49deFF12f56DB3C324D05ad84B3fdE8eB8').call());
//     // var acct = w3.eth.account.privateKeyToAccount('0x5b535eb83bbacba8306f8d726eaab727a23c108a78a73926d243936c5b2a8413');

//     // var construct_txn = USDT.constructor().buildTransaction({
//     //     'from': acct.address,
//     //     'nonce': w3.eth.getTransactionCount(acct.address),
//     //     'gas': 1728712,
//     //     'gasPrice': w3.toWei('1', 'tether')
//     // })

//     // var signed = acct.signTransaction(construct_txn);

//     // w3.eth.sendRawTransaction(signed.rawTransaction);



//     //await USDT.methods.transfer('0x6B9fb28D6d31fe0C7508Be4892F32A7976C9D072', 1).send({ from: '0x1bcDd362fd1bDa520D61EC853A92903C68781532' });
//     //console.log(await web3.eth.getBalance('0xd3E82e49deFF12f56DB3C324D05ad84B3fdE8eB8'));
//     // web3.eth.accounts.signTransaction({
//     //     to: '0x6B9fb28D6d31fe0C7508Be4892F32A7976C9D072',
//     //     value: '999964036223766000',
//     //     gas: 2000000
//     // }, '0x8770410f856e6a76607725436aaa58b47f2ac12e78c119afd51b0eea811f7ef6')
//     //     .then(console.log);
//     // web3.eth.sendSignedTransaction('0xf86d0185012a05f200831e8480946b9fb28d6d31fe0c7508be4892f32a7976c9d072880de095fe2f488df0802aa07521ae35245eaec9343d9753d6c5c794da9709194550543127a3903f434ac753a0467510a891939ab131cc48b2ec3d67d8408321cf880bf15d5ee278d2c732e206')
//     //     .on('receipt', console.log);

//     //console.log(USDT.methods);
//     //await USDT.methods.transfer('0x6B9fb28D6d31fe0C7508Be4892F32A7976C9D072', 1).send({ from: '0xd3E82e49deFF12f56DB3C324D05ad84B3fdE8eB8' });
//     //var acc = Web3.eth.accounts.create();
//     //eth.getAccounts(console.log);
//     //
//     //var account = web3.eth.accounts.wallet.create(2, '54674321§3456764321§345674321§3453647544±±±§±±±!!!43534534534534');
//     //console.log(account);
//     //web3.eth.accounts.wallet.save('test#!$');
//     //var accounts = web3.eth.accounts.wallet.load('test#!$', 'web3js_wallet');
//     //web3.eth.accounts.sign(data, privateKey);
//     //console.log(web3.eth.accounts.wallet);
//     //web3.eth.accounts.create();
//     // web3.eth.personal.newAccount('!@superpassword')
//     //     .then(console.log);
//     // let accounts = await web3.eth.getAccounts();
//     // console.log(accounts);
//     return res.status(200).send({ data: 'ok' });
// });

module.exports = router;