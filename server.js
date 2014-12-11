// Serveur principal pour interroger les API OpenDataSoft et MeteoFrance
// http://api.tiles.mapbox.com/v3/examples.map-zr0njcqy/geocode/2.34,48.85.json

//Chargement des bibliothèques
var express = require('express');
var app = express();
var http = require('http').Server(app);
var request = require('request');
var io = require('socket.io')(http);
var async = require('async');

//Initialisation du répertoire public
app.use("/", express.static(__dirname + '/public'));

//Lors de la connexion d'un client
io.on('connection', function(socket) {
    console.log('a user connected');

    socket.on('disconnect', function() {
        console.log('user disconnected');
    });

    //A réception d'un nouveau lieu pour ce client
    socket.on('newCity', function(city) {
        var cityRequest = city,
            cityFound;

        //Taches asynchrones en série
        async.series([

        	//Recherche de la ville et code Insee par Nom et Code postal
            function(callback) {
                url = "http://public.opendatasoft.com/api/records/1.0/search?dataset=correspondance-code-insee-code-postal&q=" + cityRequest + "&sort=population";
                request(url, function(error, response, content) {
                    if (!error) {
                        response = JSON.parse(content);
                        if (response.records.length > 0) {
                            cityFound = {
                                name: response.records[0].fields.nom_comm,
                                insee: response.records[0].fields.insee_com
                            };
                            callback(null, "City Found");
                        } else {
                            return callback("City unknown", null);
                        }
                    }
                    else {
                    	return callback("Connexion error", null);
                    }
                });
            },

            //Recherche des pluies dans la prochaine heure
            function(callback) {
                url = 'http://www.meteofrance.com/mf3-rpc-portlet/rest/pluie/' + cityFound.insee + "0";
                request(url, function(error, response, content) {
                    if (!error) {
                        response = JSON.parse(content);
                        if (response.isAvailable == true) {
                            results = [{
                                "heure": "dans 5 minutes",
                                "force": response.dataCadran[0].niveauPluie,
                                "text": response.dataCadran[0].niveauPluieText
                            }, {
                                "heure": "dans 10 minutes",
                                "force": response.dataCadran[1].niveauPluie,
                                "text": response.dataCadran[1].niveauPluieText
                            }, {
                                "heure": "dans un quart d'heure",
                                "force": response.dataCadran[2].niveauPluie,
                                "text": response.dataCadran[2].niveauPluieText
                            }, {
                                "heure": "dans 20 minutes",
                                "force": response.dataCadran[3].niveauPluie,
                                "text": response.dataCadran[3].niveauPluieText
                            }, {
                                "heure": "dans 25 minutes",
                                "force": response.dataCadran[4].niveauPluie,
                                "text": response.dataCadran[4].niveauPluieText
                            }, {
                                "heure": "dans une demi-heure",
                                "force": response.dataCadran[5].niveauPluie,
                                "text": response.dataCadran[5].niveauPluieText
                            }, {
                                "heure": "dans 35 minutes",
                                "force": response.dataCadran[6].niveauPluie,
                                "text": response.dataCadran[6].niveauPluieText
                            }, {
                                "heure": "dans 40 minutes",
                                "force": response.dataCadran[7].niveauPluie,
                                "text": response.dataCadran[7].niveauPluieText
                            }, {
                                "heure": "dans trois quart d'heure",
                                "force": response.dataCadran[8].niveauPluie,
                                "text": response.dataCadran[8].niveauPluieText
                            }, {
                                "heure": "dans 50 minutes",
                                "force": response.dataCadran[9].niveauPluie,
                                "text": response.dataCadran[9].niveauPluieText
                            }, {
                                "heure": "dans 55 minutes",
                                "force": response.dataCadran[10].niveauPluie,
                                "text": response.dataCadran[10].niveauPluieText
                            }, {
                                "heure": "dans une heure",
                                "force": response.dataCadran[11].niveauPluie,
                                "text": response.dataCadran[11].niveauPluieText
                            }];

                            pluie = false;
                            for (var i = 0; i < results.length; i++) {
                                if (results[i].force > 1) {
                                    cityFound['nextRain'] = "Il pleuvra " + results[i].heure;
                                    pluie = true;
                                    callback(null, "It's gonna rain");
                                    break;
                                }
                            }
                            if (!pluie) {
                                cityFound['nextRain'] = "Il ne pleuvra pas dans l'heure";
                                callback(null, "It's not gonna rain");
                            }
                            callback();
                        } else {
                            return callback("Data unavailable", null);
                        }
                    }
                });
            },

            //Envoi de la réponse par retour de socket
            function(callback) {
            	socket.emit('response', cityFound);
            	callback(null,"Socket emit")
            }
        ], 
        //Fonction Callback et gestion des erreurs
        function(err, results) {
            if (err) {
            	if (cityFound !== null) {
            		socket.emit('problem', cityRequest+" : "+err);
            		console.log(cityRequest+" : "+err);
            	}
            	else {
            		socket.emit('problem', cityFound.name+" : "+err);
            		console.log(cityFound.name+" : "+err);
            	}
            	//throw err;
            }
        });
    });

//A réception de nouvelles coordonnées pour ce client
    socket.on('newCoords', function(coords) {
        var cityRequest,
            cityFound,
            zipCode;

        //Taches asynchrones en série
        async.series([

        	//Recherche du code postal à partir des coordonnées
            function(callback) {
                url = "http://api.tiles.mapbox.com/v3/examples.map-zr0njcqy/geocode/"+coords.longitude+","+coords.latitude+".json";
                request(url, function(error, response, content) {
                    if (!error) {
                        response = JSON.parse(content);
                        zipCode = response.results[0][1].name;
                        callback(null, "Code Found");
                    }
                    else {
                    	return callback("Connexion error", null);
                    }
                });
            },

        	//Recherche de la ville et code Insee par Nom et Code postal
            function(callback) {
                url = "http://public.opendatasoft.com/api/records/1.0/search?dataset=correspondance-code-insee-code-postal&q=" + zipCode + "&sort=population";
                request(url, function(error, response, content) {
                    if (!error) {
                        response = JSON.parse(content);
                        if (response.records.length > 0) {
                            cityFound = {
                                name: response.records[0].fields.nom_comm,
                                insee: response.records[0].fields.insee_com
                            };
                            callback(null, "City Found");
                        } else {
                            return callback("City unknown", null);
                        }
                    }
                    else {
                    	return callback("Connexion error", null);
                    }
                });
            },

            //Recherche des pluies dans la prochaine heure
            function(callback) {
                url = 'http://www.meteofrance.com/mf3-rpc-portlet/rest/pluie/' + cityFound.insee + "0";
                request(url, function(error, response, content) {
                    if (!error) {
                        response = JSON.parse(content);
                        if (response.isAvailable == true) {
                            results = [{
                                "heure": "dans 5 minutes",
                                "force": response.dataCadran[0].niveauPluie,
                                "text": response.dataCadran[0].niveauPluieText
                            }, {
                                "heure": "dans 10 minutes",
                                "force": response.dataCadran[1].niveauPluie,
                                "text": response.dataCadran[1].niveauPluieText
                            }, {
                                "heure": "dans un quart d'heure",
                                "force": response.dataCadran[2].niveauPluie,
                                "text": response.dataCadran[2].niveauPluieText
                            }, {
                                "heure": "dans 20 minutes",
                                "force": response.dataCadran[3].niveauPluie,
                                "text": response.dataCadran[3].niveauPluieText
                            }, {
                                "heure": "dans 25 minutes",
                                "force": response.dataCadran[4].niveauPluie,
                                "text": response.dataCadran[4].niveauPluieText
                            }, {
                                "heure": "dans une demi-heure",
                                "force": response.dataCadran[5].niveauPluie,
                                "text": response.dataCadran[5].niveauPluieText
                            }, {
                                "heure": "dans 35 minutes",
                                "force": response.dataCadran[6].niveauPluie,
                                "text": response.dataCadran[6].niveauPluieText
                            }, {
                                "heure": "dans 40 minutes",
                                "force": response.dataCadran[7].niveauPluie,
                                "text": response.dataCadran[7].niveauPluieText
                            }, {
                                "heure": "dans trois quart d'heure",
                                "force": response.dataCadran[8].niveauPluie,
                                "text": response.dataCadran[8].niveauPluieText
                            }, {
                                "heure": "dans 50 minutes",
                                "force": response.dataCadran[9].niveauPluie,
                                "text": response.dataCadran[9].niveauPluieText
                            }, {
                                "heure": "dans 55 minutes",
                                "force": response.dataCadran[10].niveauPluie,
                                "text": response.dataCadran[10].niveauPluieText
                            }, {
                                "heure": "dans une heure",
                                "force": response.dataCadran[11].niveauPluie,
                                "text": response.dataCadran[11].niveauPluieText
                            }];

                            pluie = false;
                            for (var i = 0; i < results.length; i++) {
                                if (results[i].force > 1) {
                                    cityFound['nextRain'] = "Il pleuvra " + results[i].heure;
                                    pluie = true;
                                    callback(null, "It's gonna rain");
                                    break;
                                }
                            }
                            if (!pluie) {
                                cityFound['nextRain'] = "Il ne pleuvra pas dans l'heure";
                                callback(null, "It's not gonna rain");
                            }
                            callback();
                        } else {
                            return callback("Data unavailable", null);
                        }
                    }
                });
            },

            //Envoi de la réponse par retour de socket
            function(callback) {
            	socket.emit('response', cityFound);
            	callback(null,"Socket emit")
            }
        ], 
        //Fonction Callback et gestion des erreurs
        function(err, results) {
            if (err) {
            	if (cityFound !== null) {
            		socket.emit('problem', cityRequest+" : "+err);
            		console.log(cityRequest+" : "+err);
            	}
            	else {
            		socket.emit('problem', cityFound.name+" : "+err);
            		console.log(cityFound.name+" : "+err);
            	}
            	//throw err;
            }
        });
    });
});

//Créer serveur
http.listen('8081', function() {
    console.log('Magic happens on port 8081');
});
