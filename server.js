// Serveur principal pour interroger les API OpenDataSoft et MeteoFrance
// http://api.tiles.mapbox.com/v3/examples.map-zr0njcqy/geocode/2.34,48.85.json

//Chargement des bibliothèques
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var rainWatchScraper = require('./rainWatchScraper.js');

//Initialisation du répertoire public
app.use("/", express.static(__dirname + '/public'));

//Lors de la connexion d'un client
var nbClients = 0;
io.on('connection', function(socket) {
	nbClients++;
    console.log('a user connected '+nbClients);
    io.emit('nbClients',nbClients);

    socket.on('disconnect', function() {
    	nbClients--;
    	io.emit('nbClients',nbClients);
        console.log('user disconnected '+nbClients);
    });

    //A réception d'un nouveau lieu pour ce client
    socket.on('newCity', function(query) {
    	    	console.log(query)
        rainWatchScraper.getRain(null,query,socket);
    });

	//A réception de nouvelles coordonnées pour ce client
    socket.on('newCoords', function(coords) {
    	rainWatchScraper.getRain(coords,null,socket);
    });
});

//Créer serveur
http.listen('8081', function() {
    console.log('Magic happens on port 8081');
});
