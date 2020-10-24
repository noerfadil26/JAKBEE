var logger = function (req, res, next) {
  let time = new Date()
  console.log( time.toISOString() + " ->  " + req.method + ' "' + req.url + '"') 
  next()
}

module.exports = logger