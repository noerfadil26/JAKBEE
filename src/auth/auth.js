const { default: Axios } = require('axios')
const { response } = require('express')

const express = require('express')
    , router = express.Router()
    , { User } = require('../db/model')
    , bcrypt = require('bcrypt')
    , saltRounds = 10
    , salt = bcrypt.genSaltSync(saltRounds)
    , jwt = require('jsonwebtoken')
    , fs = require('fs')
    , formData = require('form-data')
    , qs = require('qs');

router.post('/login', async (req, res, next) => {

    let email = req.body.email
    let password = req.body.password

    if (!email || !password) {
        res.status(400)
        res.json({msg: 'Fill in the forms carefully'})
    } else {
        
        let loginCheck = await User.where('email', '==', email)
                                    .where('devices', '==', req.headers['user-agent'])
                                    .where('state', '==', 'login')
                                    .get().then(it => {
                                        if (it.empty) {
                                            return false
                                        } else {
                                            let id
                                            it.forEach(docs => id = docs.id)
                                            return id
                                        }
                                    })
                                    .catch(err => console.log(err))
        
        let secret = 'a'
        let loginState = !loginCheck ? false : await User.doc(loginCheck).get().then(it => {
            secret = it.data().secret
            return !loginCheck ? false : it.data().logged_in ? it.data().secret : 'out'
        })

        let loginResult = loginState == false ? false : loginState == 'out' ? await User.doc(loginCheck).update({
            logged_in: true
        }).then(() => secret).catch(err => console.log(err)) : loginState

        let registerCheck = loginResult ? false : await User.where('email', '==', email)
                                                                    .where('state', '==', 'register')
                                                                    .get().then(it => {
                                                                        if (it.empty) {
                                                                            return false
                                                                        } else {
                                                                            let id, password
                                                                            it.forEach(docs => {
                                                                                id = docs.id
                                                                                password = docs.data().password
                                                                            })
                                                                            return {id: id, password: password}
                                                                        }
                                                                    }).catch(err => console.log(err))

                                                                    console.log(registerCheck)
                                    
        let passwordCheck = !registerCheck ? false : await bcrypt.compareSync(password, registerCheck.password) ? registerCheck.id : 404

        let resultId
        let result = registerCheck == 404 ? 'User not found' : registerCheck == false ? loginResult : await User.add({
            devices: req.headers['user-agent'],
            email: email,
            logged_in: true,
            login_on: new Date(),
            state: 'login',
            user_id: passwordCheck
        }).then(it => {
            resultId = it.id
            return true
        }).catch(err => console.log(err))

        const privateKey = await fs.readFileSync(__dirname + '/private.key')
        const token = await jwt.sign({ session: resultId, date: new Date() }, privateKey, { algorithm: 'RS256'});
        
        let secretUpdate = result !== true ? result : await User.doc(resultId).update({
            secret: token
        }).then(it => {
            return token
        }).catch(err => console.log(err))

        res.status(!secretUpdate ? 401 : 200)
        res.json({msg: String(secretUpdate)})
    }

})

router.post('/register', async (req, res, next) => {

    if (!req.body.email || !req.body.password || !req.body.name || !req.body.tnc) {
        console.log("Register 1")
        res.status(400)
        res.json({msg: 'Fill in the forms carefully'})
    } else {

        console.log("register 2")

        let dataId;
        
        let state = await User.where('email', '==', req.body.email).get().then(it => it.empty ? true : false).catch(err => console.log(err))

        state = state ? await User.add({
            name: req.body.name,
            email: req.body.email,
            password: await bcrypt.hashSync(req.body.password, salt),
            tnc: req.body.tnc,
            state: 'register',
            confirmed: false
        }).then(it => {
            dataId = it.id
            return true
        }).catch(err => console.log(err)) : false

        var data = JSON.stringify({"subject":"Kode OTP Pendaftaran XCO-19","message":"klik link berikut untuk menyelesaikan prosedur pendaftaran : http://xco19.herokuapp.com/auth/otp?code={{otp}}&id=" + dataId,"recipient":req.body.email,"digit":0,"expire":1,"maxattempt":0});
        
        var config = {
          method: 'put',
          url: 'https://api.thebigbox.id/email-otp/0.0.1/send/1',
          headers: { 
            'x-api-key': '1Q0a8hPsKjz5BmdpbnAGeBC8946lA4vW', 
            'Content-Type': 'application/json'
          },
          data : data
        };
        
        let sendOTP = !state ? false : await Axios(config).then(function (response) {
                                            console.log(JSON.stringify(response.data));
                                            })
                                            .catch(function (error) {
                                            console.log(error);
                                            });
        
        res.json({msg: state})

    }
    
})

router.get('/otp', async (req, res, next) => {

    if (!req.query.code && !req.query.id) {
        res.status(400).json({'msg': 'user side error'})
    } else {
                   
        var data = qs.stringify({
         'expire': '1440',
        'digit': '0',
        'otpstr': '0582' 
        });
        var config = {
          method: 'post',
          url: 'https://api.thebigbox.id/email-otp/0.0.1/verify/1',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded', 
            'x-api-key': '1Q0a8hPsKjz5BmdpbnAGeBC8946lA4vW'
          },
          data : data
        };
        
        await Axios(config)
        .then(function (response) {
            User.doc(req.query.id).update({ confirmed: true }).then(() => res.status(200).json({msg: 'success'})).catch(err => console.log(err))
          console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
          console.log(error);
          res.status(400).json({msg: 'failed'})
        });
    }

})

module.exports = router