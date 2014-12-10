var express = require('express');
var app     = express();
var http = require('http').Server(app);
var request = require('request');
var io = require('socket.io')(http);

app.use("/", express.static(__dirname + '/public'));

app.get('/scrape/:city', function(req, res){

	getInseeId(req.params.city);
    res.send('Check your console!');

});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
  socket.on('newTown', function(town){
  	getInseeId(town,socket);
  });
});

http.listen('8081',function() {
	console.log('Magic happens on port 8081');
});

function getInseeId(query,socket) {
	url = "http://public.opendatasoft.com/api/records/1.0/search?dataset=correspondance-code-insee-code-postal&q="+query+"&sort=population";
	request(url,function(error,response,content){
		if(!error) {
			response = JSON.parse(content);
			if(response.records.length>0) {
				getRain({
					name: response.records[0].fields.nom_comm,
					insee: response.records[0].fields.insee_com
				},socket);
				//console.log("City found : " + response.records[0].fields.nom_comm);
			}
			else {
				socket.emit('problem', {
					text: "City unknown",
					input: query
				});
				//console.log("City unknown")
			}
		}
	});
}

function getRain(city,socket) {
	url = 'http://www.meteofrance.com/mf3-rpc-portlet/rest/pluie/'+city.insee+"0";
	request(url,function(error,response,content){
		if(!error) {
			response = JSON.parse(content);
			if(response.isAvailable==true) {
				//console.log("Data available : " + response.niveauPluieText);
				results = [{
					"heure" : "dans 5 minutes",
					"force" : response.dataCadran[0].niveauPluie,
					"text" : response.dataCadran[0].niveauPluieText
				},
				{
					"heure" : "dans 10 minutes",
					"force" : response.dataCadran[1].niveauPluie,
					"text" : response.dataCadran[1].niveauPluieText
				},
				{
					"heure" : "dans un quart d'heure",
					"force" : response.dataCadran[2].niveauPluie,
					"text" : response.dataCadran[2].niveauPluieText
				},
				{
					"heure" : "dans 20 minutes",
					"force" : response.dataCadran[3].niveauPluie,
					"text" : response.dataCadran[3].niveauPluieText
				},
				{
					"heure" : "dans 25 minutes",
					"force" : response.dataCadran[4].niveauPluie,
					"text" : response.dataCadran[4].niveauPluieText
				},
				{
					"heure" : "dans une demi-heure",
					"force" : response.dataCadran[5].niveauPluie,
					"text" : response.dataCadran[5].niveauPluieText
				},
				{
					"heure" : "dans 35 minutes",
					"force" : response.dataCadran[6].niveauPluie,
					"text" : response.dataCadran[6].niveauPluieText
				},
				{
					"heure" : "dans 40 minutes",
					"force" : response.dataCadran[7].niveauPluie,
					"text" : response.dataCadran[7].niveauPluieText
				},
				{
					"heure" : "dans trois quart d'heure",
					"force" : response.dataCadran[8].niveauPluie,
					"text" : response.dataCadran[8].niveauPluieText
				},
				{
					"heure" : "dans 50 minutes",
					"force" : response.dataCadran[9].niveauPluie,
					"text" : response.dataCadran[9].niveauPluieText
				},
				{
					"heure" : "dans 55 minutes",
					"force" : response.dataCadran[10].niveauPluie,
					"text" : response.dataCadran[10].niveauPluieText
				},
				{
					"heure" : "dans une heure",
					"force" : response.dataCadran[11].niveauPluie,
					"text" : response.dataCadran[11].niveauPluieText
				}];

				pluie = false;
				for (var i = 0; i < results.length; i++) {
					if(results[i].force > 1) {
						city['nextRain'] = "Il pleuvra "+results[i].heure;
						//console.log("Il pleuvra "+results[i].heure);
						pluie = true;
						break;
					}
				}
				if(!pluie) {
					city['nextRain'] = "Il ne pleuvra pas dans l'heure";
					//console.log("Il ne pleuvra pas dans l'heure");
				}
				socket.emit('response', city);
			}
			else {
				socket.emit('problem', {
					text: "Data unavailable",
					input: city.name
				});
				//console.log("Data unavailable")
			}
		}
	});
}