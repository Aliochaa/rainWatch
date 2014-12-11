var async = require('async');
var request = require('request');

function getRain(coords,query,socket) {
    var city = {
        coords: coords,
        query: query,
        name: null,
        inseeCode: null,
        response: {
            text: null,
            force: null
        }
    };

    function getPostcodeByCoords(callback) {
        url = "http://api.tiles.mapbox.com/v3/examples.map-zr0njcqy/geocode/" + city.coords.longitude + "," + city.coords.latitude + ".json";
        request(url, function(error, response, content) {
            if (!error) {
                response = JSON.parse(content);
                city.query = response.results[0][1].name;
                callback(null, "Code Found");
            } else {
                callback("Connexion error", null);
            }
        });
    };

    function getInseecodeByPostcode(callback) {
        url = "http://public.opendatasoft.com/api/records/1.0/search?dataset=correspondance-code-insee-code-postal&q=" + city.query + "&sort=population";
        request(url, function(error, response, content) {
            if (!error) {
                response = JSON.parse(content);
                if (response.records.length > 0) {
                    city.name = response.records[0].fields.nom_comm;
                    city.inseeCode = response.records[0].fields.insee_com;
                    callback(null, "City Found");
                } else {
                    callback("City unknown", null);
                }
            } else {
                callback("Connexion error", null);
            }
        });
    }

    function getRainByInseecode(callback) {
        url = 'http://www.meteofrance.com/mf3-rpc-portlet/rest/pluie/' + city.inseeCode + "0";
        request(url, function(error, response, content) {
            if (!error) {
                response = JSON.parse(content);
                if (response.isAvailable == true) {
                    pluie = false;
                    for (var i = 0; i < response.dataCadran.length; i++) {
                        if (response.dataCadran[i].force > 1) {
                            city.response.text = "It's gonna rain in " + (i+1*5) + " minutes";
                            city.response.force = response.dataCadran[i].niveauPluie;
                            pluie = true;
                            callback(null, "It's gonna rain");
                            break;
                        }
                    }
                    if (!pluie) {
                        city.response.text = "It's not gonna rain";
                        callback(null, "It's not gonna rain");
                    }
                } else {
                    callback("Data unavailable", null);
                }
            }
        });
    }

    function getRainByCoords() {
        async.series([
            function(callback) {
                getPostcodeByCoords(callback);
            },
            function(callback) {
                getInseecodeByPostcode(callback);
            },
            function(callback) {
                getRainByInseecode(callback);
            }],
            function(err,results) {
                //console.log(err);
                //console.log(results);
                socket.emit('response', city);
                console.log(city);
            });
    }

    function getRainByRequest() {
        async.series([
            function(callback) {
                getInseecodeByPostcode(callback);
            },
            function(callback) {
                getRainByInseecode(callback);
            }],
            function(err,results) {
                //console.log(err);
                //console.log(results);
                socket.emit('response', city);
                console.log(city);
            });
    }
    if(coords===null) {
        getRainByRequest();
    }
    else {
        getRainByCoords();
    }
}
exports.getRain = getRain;

