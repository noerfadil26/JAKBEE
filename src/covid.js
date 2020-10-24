const { default : axios } = require('axios');
const { response } = require('express');

const covid = async (req, res) => {
    const lat = req.body.lat
        , lon = req.body.lon
    
    if (!lat || !lon) {
        res.status(400).json({msg: 400})
    } else {
        let dataKota, dataResult;
        const userCity = await axios.get(`https://reverse.geocoder.api.here.com/6.2/reversegeocode.json?prox=${lat}%2C${lon}%2C250&mode=retrieveAddresses&maxresults=1&gen=9&app_id=9fqnaB6d6rLJWxFpNASK&app_code=RoB26jtN0zFQ1BBhPdJe2A`)
                                    .then(function (response) {
                                        // handle success
                                        dataKota = response.data.Response.View[0].Result[0].Location.Address.County.toUpperCase()
                                        console.log(dataKota)
                                        if (dataKota) {
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
                    
            , result = !userCity ? false : await axios.get(`https://corona.coollabs.work/indonesia/provinsi/${dataKota}`)
                                                        .then(response => {
                                                            dataResult = {provinsi: response.data.Provinsi,positif:response.data.Kasus_Posi, sembuh: response.data.Kasus_Semb, meninggal: response.data.Kasus_Meni}
                                                            console.log(dataResult)
                                                            return dataResult ? true : false
                                                        }).catch(err => {console.log(err); return false})

                                    res.status(!result ? 400 : 200).json(dataResult)
    }
    
}

module.exports = covid