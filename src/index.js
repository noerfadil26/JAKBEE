const express = require('express')
    , cookieParser = require('cookie-parser')
    , cors = require('cors')
    , bodyParser = require('body-parser')
    , user = require('./user/user')
    , sensor = require('./sensor')
    , cron = require('node-cron')
    , axios = require('axios')
    , { Zone, Berita } = require('./db/model')
    , covid = require('./covid')
    , request = require('request')
    , cheerio = require('cheerio')
    , berita = require('./berita')
    , path = require('path')


require('dotenv').config()

// Local
const logger = require('./logger')
const port = process.env.PORT

// Services
const auth = require('./auth/auth')
const jwt = require('./auth/jwt')
const { authenticateToken } = require('./auth/jwt')

// Configuration
const app = express()

// App Configure
    app.use(express.static('public'));
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(bodyParser.json())

app.use(logger)

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname+'/index.html'))
})

app.use('/auth', auth)
app.use('/user', authenticateToken , user)

app.get('/sensor', sensor)

app.post('/covid', covid)

app.get('/berita', berita)

app.use( async (req, res, next) => {

    res.status(404)
    res.json({msg: 'not found'})

})

app.use((err, req, res, next) => {

    console.log(err)
    res.status(500)
    res.json({msg: 'system error'})

});

cron.schedule('1 50 1 22 8 *',  function() {
    axios({
        method: 'get',
        url: 'https://data.covid19.go.id/public/api/skor.json'})
        .then(async function (response) {
            console.log(" => HTTP STATUS: " + response.status)
            console.log(" => DATA UPDATE: " + response.data.tanggal)
            Zone.doc("updated_on").set({date: response.data.tanggal}).then(() => console.log('success')).catch(err => console.log(err))
            for (const key in response.data.data) {
                const element = response.data.data[key]
                const write = Zone.doc(element.kota).set({
                    kota: element.kota,
                    status: element.hasil
                }).then(it => ".").catch(err => console.log(err))
            }
        })
        .catch(function (response) {
            //handle error
            console.log(response);
        })
  })

cron.schedule('47 23 * * *', () => {
    let url = 'https://covid19.go.id/p/berita';

request(url,async function (err, res, body) {
    if (err && res.statusCode !== 200) throw err;

    let $ = cheerio.load(body),
        data = []
    $('.card').each(async (i, value) => {

        let result = [];
        
        $(value).find('time.text-1.m-0.text-color-secondary').each((j, value1) => {
            result["time"] = $(value1).text()
        })
        $(value).find(".card-body.p-0 h4.card-title.mb-3.text-5.font-weight-semibold a").each((j, value1) => {
            result["title"] = $(value1).text()
        }) 
        $(value).find('img.card-img-top.border-radius-0').each((j, value1) => {
            result["img"] = value1.attribs['data-original']
            result["url"] = value1.parent.attribs.href
        })
        
        data.push(result)
        
    });

    await data.forEach(it => {
        let url = it['url']
        request(url,async function (err, res, body) {
            let page = await cheerio.load(body)
              , Link = url
              , Judul = page("h2.font-weight-bold").text()
              , Time = page("span time").text()
              , Artikel = page("#konten-artikel").html()
              , Img = page("img.img-fluid.img-thumbnail.rounded-0.w-100.img-thumbnail-no-borders").attr("src")
            let write = await Berita.doc(Judul).set({
                                                                                        time: Time,
                                                                                        title: Judul,
                                                                                        url: Link,
                                                                                        artikel: Artikel,
                                                                                        image: Img
                                                                                    }).then(it => it ? true : false).catch(err => console.log(err))
                                                                                    console.log(write)
        })
    })
})
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })
