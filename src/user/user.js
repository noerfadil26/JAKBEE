const { response } = require('express')

const express = require('express')
    , router = express.Router()
    , fs = require('fs')
    , { User, Sensor, Location, Zone } = require('../db/model')
    , {default: axios} = require('axios')

router.get('/logout', async (req, res) => {

    const userCheck = await User.doc(req.user).get().then(it => {
        if (it.exists) {
            return it.data().logged_in
        } else {
            return false
        }
    })

    const logout = !userCheck ? false : await User.doc(req.user).update({
        logged_in: false,
        logout_on: new Date()
    }).then(it => {
        return true
    }).catch(err => console.log(err))

    res.status(logout == false ? 400 : 200)
    res.json({msg: logout})

})

router.get('/info', async (req, res) => {
    
    console.log("USER INFO => START")
    console.log(`USER INFO => ${req.user}`)

    const getId = await User.doc(req.user).get().then(it => {
        if (it.exists) {
            return it.data().user_id
        } else {
            return false
        }
    })

    const getInfo = !getId ? false : await User.doc(getId).get().then(it => {
        if (it.exists) {
            return {
                name: it.data().name,
                email: it.data().email,
                nohp: it.data().nohp
            }
        } else {
            return false
        }
    })

    res.status(getInfo == false ? 400 : 200)
    res.json({name: getInfo.name, email: getInfo.email, nohp: getInfo.nohp})
})

router.get('/sensor', async (req, res) => {

    const userCheck = await User.doc(req.user).get().then(it => {
        if (it.exists) {
            return it.data().user_id
        } else {
            return false
        }
    })

    console.log(userCheck)

    const getData = !userCheck ? false : await Sensor.where('user_id', '==', userCheck)
                                                        .orderBy('write_on', 'desc')
                                                        .limit(1).get().then(it => {
                                                            if (!it.empty) {
                                                                let data
                                                                it.forEach(docs => {
                                                                    let tgl = docs.data().write_on.toDate()
                                                                    tgl = tgl.getDate() + "-" + tgl.getMonth() + "-" + tgl.getFullYear() + " " + tgl.getHours() + ":" + tgl.getMinutes() + ":" + tgl.getSeconds()
                                                                    data = {
                                                                        coughState: docs.data().cough_state,
                                                                        coughOdd: docs.data().cough_odd,
                                                                        tempState: docs.data().temp_state,
                                                                        tempOdd: docs.data().temp_odd,
                                                                        oxyState: docs.data().oxy_state,
                                                                        oxyOdd: docs.data().oxy_odd,
                                                                        location: docs.data().location_state,
                                                                        location_status: docs.data().location_odd,
                                                                        status: docs.data().user_status,
                                                                        writeOn: tgl
                                                                    }
                                                                })
                                                                return data
                                                            } else {
                                                                return false
                                                            }
                                                        }).catch(err => console.log(err))

                                                        console.log(getData)
                                                
    res.status(!getData ? 400 : 200)
    res.json(getData)
})

router.post('/gps', async (req, res) => {

    const lat = req.body.lat
    const lon = req.body.lon

    if (!lat || !lon) {
        res.status(400)
        res.json({msg: 'Fill in the form carefully'})
    } else {

        let dataCheck, dataKota, dataZone, dataCheck2, nohp;

        const userCheck = await User.doc(req.user).get().then(it => {
            if (it.exists) {
                dataCheck = it.data().user_id
                return true
            } else {
                return false
            }
        })

        const userCity = !dataCheck ? false : await axios.get(`https://reverse.geocoder.api.here.com/6.2/reversegeocode.json?prox=${lat}%2C${lon}%2C250&mode=retrieveAddresses&maxresults=1&gen=9&app_id=9fqnaB6d6rLJWxFpNASK&app_code=RoB26jtN0zFQ1BBhPdJe2A`)
                                    .then(function (response) {
                                        // handle success
                                        const kota = response.data.Response.View[0].Result[0].Location.Address.City.toUpperCase() == "TASIKMALAYA KOTA" ? "Kota Tasikmalaya" : response.data.Response.View[0].Result[0].Location.Address.City
                                        console.log(kota.toUpperCase())
                                        if (kota) {
                                            dataKota = kota
                                            return true
                                        } else {
                                            return false
                                        }                                        
                                    })
                                    .catch(function (error) {
                                        // handle error
                                        console.log(error);
                                        return false
                                    })
        console.log(dataKota)
        const checkZone = !userCity ? false : await Zone.doc(dataKota.toUpperCase()).get().then(it => {
            if(it.exists) { dataZone = it.data().status; return true} else return false
        }).catch(err => {console.log(err); return false})

        const check = !checkZone ? false : await User.doc(req.user).get().then(it => {
            console.log(req.user + " is " + it.exists)
            if (it.exists) {
                console.log("your location is on " + it.data().location_status)
                if (it.data().location_status == dataZone) {
                    console.log("WHY AM HERE?")
                    dataCheck2 = false
                } else {
                    console.log("AM HERE BUT WHY RETURN FALSE OY!")
                    dataCheck2 = true
                }
            } else {
                return false
            }
        }).then(() => true).catch(err => {console.log(err); return false})

        const write = !dataCheck2 ? false : await User.doc(req.user).update({
            longitude: lon,
            latitude: lat,
            location: dataKota,
            location_status: dataZone,
            write_on: new Date()
        }).then(() => true).catch(err => {console.log(err); return false})

        const getNohp = !write ? false : await User.doc(dataCheck).get().then(it => {
            if (it.exists) {
                nohp = it.data().nohp
                return true
            } else {
                return false
            }
        }).catch(err => console.log(err))

        const sms = !getNohp ? false : dataZone !== "RESIKO TINGGI" ? false : await axios({method: "post", url: "https://api.thebigbox.id/sms-notification/1.0.0/messages",
                                                                                            data: "msisdn="+ nohp +"&content=take%20care%20of%20yourself,%20you%20are%20in%20the%20red%20zone%20of%20COVID-19",
                                                                                            headers: {'Content-Type': 'application/x-www-form-urlencoded', 'x-api-key': 'sNXYeU73io97jeS3B0jHXWzuRNEHgHyU'}                                                                        
                                                                                        }).then((response) => {console.log(response);return true}).catch(err => {console.log(err); return false})

        const result = !sms ? !dataCheck2 ? {city: dataKota, state: dataZone} : !write ? 500 : {city: dataKota, state: dataZone} : {city: dataKota, state: dataZone}    
        
        console.log("userCheck => " + userCheck)
        console.log("dataCheck => " + dataCheck)
        console.log("userCity => " + userCity)
        console.log("dataCity => " + dataKota)
        console.log("checkZone => " + checkZone)
        console.log("dataZone => " + dataZone)
        console.log("check => " + check)
        console.log("write => " + write)
        console.log("nohp => " + nohp)
        console.log("getNohp => " + getNohp)
        console.log("sms => " + sms)
        console.log("result => " + result)

        res.status(!sms ? !dataCheck2 ? 200 : !write ? 500 : 200 : 200)
        res.json(result)
    }
})

router.post("/nohp", async (req, res) => {

    let dataUserId

    console.log(req.user)

    if (req.body.nohp) {
        
        const getUserId = !req.user ? false : await User.doc(req.user).get().then(it => {
            if (it.exists) {
                dataUserId = it.data().user_id
                return true
            } else {
                return false
            }
        })
            , writeNohp = !getUserId ? false : await User.doc(dataUserId).update({ nohp: req.body.nohp }).then(it => {
                return true
            }).catch(err => console.log(err))

        res.status(200).json({msg: !writeNohp ? "failed" : "success"})
    
    } else {
        res.status(400).json({msg: "user side error"})
    }

})

module.exports = router