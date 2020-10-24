const jwt = require('jsonwebtoken')
    , fs = require('fs')
    , { User } = require('../db/model')

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    
    if (token == null) return res.sendStatus(401)
    
    var cert = await fs.readFileSync(__dirname + '/public.key');  
    await jwt.verify(token, cert, async (err, user) => {

      let check
      
      if (err) {
        res.sendStatus(403)
        console.log(err)
      } else {
        req.user = user.session
        console.log(user.session)
        check = await User.doc(user.session).get().then(it => it.exists ? it.data().logged_in : false).catch(err => console.log(err))
        next()
      }

      
      
      
    })
  }

module.exports = { authenticateToken }