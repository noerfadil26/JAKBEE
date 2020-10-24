const { Berita } = require('./db/model')

const berita = async (req, res) => {
    let data = []
    const getBerita = await Berita.get().then(it => {
        if (it.empty) {
            console.log("BERITA => SELECTED DB LOOKS EMPTY")
            return false
        } else {
            
            it.forEach(docs => {
                if (docs.exists) {
                    data.push(docs.data())
                }
            })   
            return true       
        }
    }).catch(err => console.log(`BERITA => ${err}`))

    res.status(getBerita ? 200 : 500).json(data)
}

module.exports = berita