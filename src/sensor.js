const { Sensor, Location } = require('./db/model')

const sensor = async (req, res) => {

    const ht = req.query.ht
        , temp = req.query.temp
        , cough = req.query.strOksi
        , id = req.query.id

    if (!ht || !temp || !cough || !id) {
        res.status(400)
        res.json({msg: 'Fill in the forms carefully'})        
    } else {

        let score = 0
        let status
        let tempOdd, htOdd, coughOdd
        if (60 > ht < 100) {
            htOdd = "Normal"
            score++
        } else {
            htOdd = "Bermasalah"
        }

        if (36.5 > temp < 37.5) {
            tempOdd = "Normal"
            score++
        } else {
            tempOdd = "Bermasalah"
        }

        if (95 > cough < 100) {
            coughOdd = "Normal"
            score++
        } else {
            coughOdd = "Bermasalah"
        }

        console.log(id)

        const loc = await Location.where('user_id', '==', id).orderBy('write_on', 'desc').limit(1).get().then(it => {
            if (it.empty) {
                return false
            } else {
                let myLoc
                it.forEach(docs => {
                    myLoc = {
                        location: docs.data().location,
                        location_status: docs.data().location_status
                    }
                    console.log(docs.data())
                })

                return myLoc
            }
        }) 

        if (loc.location_status !== "RESIKO TINGGI") {
            score++
        }

        if (score>=1) {
            status = "SEHAT"
        } else {
            status = "KURANG SEHAT"
        }

        console.log(loc)

        let sensor = await Sensor.add({
            oxy_state: ht,
            oxy_odd: htOdd,
            temp_state: temp,
            temp_odd: tempOdd,
            cough_state: cough,
            cough_odd: coughOdd,
            user_id: id,
            location_state: loc.location,
            location_odd: loc.location_status,
            user_status: status,
            write_on: new Date()
        }).then(it => true).catch(err => console.log(err))
        
        res.status(!sensor ? 400 : 200)
        res.json({msg: 'success'})
    }
}

module.exports = sensor