const express = require('express');
const fs = require('fs')
const util = require("util");
const app = express();

var server = require('http').createServer(app);
var io = require('./mes_modules/chat_socket').listen(server);

const peupler = require('./mes_modules/peupler')
const bodyParser= require('body-parser')
const MongoClient = require('mongodb').MongoClient // le pilote MongoDB
const ObjectID = require('mongodb').ObjectID;
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
/* on associe le moteur de vue au module «ejs» */
app.use(express.static('public'));

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const i18n = require('i18n');
i18n.configure({ 
   locales : ['fr', 'en'],
   cookie : 'langueChoisie', 
   directory : __dirname + '/locales' 
})
app.use(i18n.init)

let db // variable qui contiendra le lien sur la BD

MongoClient.connect('mongodb://127.0.0.1:27017', (err, database) => {
 if (err) return console.log(err)
 db = database.db('carnet_adresse')

// lancement du serveur Express sur le port 8081
server.listen(8081, () => {
 console.log('connexion à la BD et on écoute sur le port 8081')
 })
})


/*
Les routes
*/

////////////////////////////////////////// Route /
app.set('view engine', 'ejs'); // générateur de template

app.get('/', function (req, res) {
      
 res.render('accueil.ejs')  
 
  });

//////////////////////////////////////////  Route Adresse
app.get('/adresse', function (req, res) {
   var cursor = db.collection('adresse')
                .find().toArray(function(err, resultat){
 if (err) return console.log(err)        
 res.render('adresse.ejs', {adresses: resultat})   
  });
})
//////////////////////////////////////////  Route Rechercher
app.post('/rechercher',  (req, res) => {
   let recherche = req.body.recherche.toLowerCase()
   let regRecherche = new RegExp(recherche, 'i')
   var match = regRecherche.exec(recherche);
	console.log("match[0] = " + match[0]); 
	console.log("match[1] = " + match[1]); 

   console.log(recherche)
   let cursor = db.collection('adresse')
                .find({$or: [ 
                				{nom: {$regex :regRecherche, $options: "$i"}},
                			  {prenom: {$regex :regRecherche, $options: "$i"}},
                			 	{telephone: {$regex :regRecherche, $options: "$i"}},
                				{courriel: {$regex :regRecherche, $options: "$i"}}
                			]
                		}).toArray(function(err, resultat){
 if (err) return console.log(err)        
 res.render('adresse.ejs', {adresses: resultat, recherche:recherche})   
  });
})
////////////////////////////////////////// Route /ajouter
app.post('/ajouter', (req, res) => {
console.log('route /ajouter')	
 db.collection('adresse').save(req.body, (err, result) => {
 if (err) return console.log(err)
 // console.log(req.body)	
 console.log('sauvegarder dans la BD')
 res.redirect('/adresse')
 })
})

////////////////////////////////////////  Route /modifier
app.post('/modifier', (req, res) => {
console.log('route /modifier')
// console.log('util = ' + util.inspect(req.body));
req.body._id = 	ObjectID(req.body._id)
 db.collection('adresse').save(req.body, (err, result) => {
	 if (err) return console.log(err)
	 console.log('sauvegarder dans la BD')
	 res.redirect('/adresse')
	 })
})


////////////////////////////////////////  Route /detruire
app.get('/detruire/:id', (req, res) => {
 console.log('route /detruire')
 // console.log('util = ' + util.inspect(req.params));	
 var id = req.params.id
 console.log(id)
 db.collection('adresse')
 .findOneAndDelete({"_id": ObjectID(req.params.id)}, (err, resultat) => {

if (err) return console.log(err)
 res.redirect('/adresse')  // redirige vers la route qui affiche la collection
 })
})


///////////////////////////////////////////////////////////   Route /trier
app.get('/trier/:cle/:ordre', (req, res) => {

 let cle = req.params.cle
 let ordre = (req.params.ordre == 'asc' ? 1 : -1)
 let cursor = db.collection('adresse').find().sort(cle,ordre).toArray(function(err, resultat){

  ordre = (req.params.ordre == 'asc' ? 'desc' : 'asc')  
 res.render('adresse.ejs', {adresses: resultat, cle, ordre })	
})

}) 
/////////////////////////////////////////////////////////  Route /peupler
app.get('/peupler', (req, res) => {
	let collectionMembre = peupler()
	/*
	for (elm of tabMembre)
	{
	let cursor = db.collection('adresse').save(elm, (err, res)=>{
		if(err) console.error(err)
			console.log('ok')

		})
	}
	*/

	let cursor = db.collection('adresse').insertMany(collectionMembre, (err, resultat)=>{
		if(err) console.error(err)
			// console.log('ok')
			// console.log(util.inspect(resultat))
			res.redirect('/adresse')
		})
})

/////////////////////////////////////////////////////////  Route /peupler
app.get('/vider', (req, res) => {

	let cursor = db.collection('adresse').drop((err, res)=>{
		if(err) console.error(err)
			console.log('ok')
			
		})
	res.redirect('/adresse')
})

app.get('/profil/:id', (req, res) => {
  var identifiant = ObjectID(req.params.id);
  db.collection('adresse').findOne({"_id":identifiant}, function(err, resultat) {
      if (err) throw err;
      console.log(resultat);
      res.render('composants/profil.ejs', {profil: resultat})
  });
})


app.get('/chat', (req, res) => {
	res.render('socket_vue.ejs')
})

//////////////////////////////////////////////////////////	Changer la langue
app.get('/:locale(en|fr)',  (req, res) => {
	res.cookie('langueChoisie' , req.params.locale);
	res.setLocale(req.params.locale)
	res.redirect(req.get('referer'))
})

////////////////////////////////////////////////////////	AJAX

// Dans notre application serveur
// Une nouvelle route pour traiter la requête AJAX

app.post('/ajax_modifier', (req,res) => {
  req.body._id = ObjectID(req.body._id)
  console.log("req.body._id = " + req.body._id)

  db.collection('adresse').save(req.body, (err, result) => {
    if (err) return console.log(err)
    console.log('sauvegarder dans la BD')
    res.send(JSON.stringify(req.body));
    // res.status(204)
  })
})


app.post('/ajax_detruire', (req,res) => {
  db.collection('adresse').findOneAndDelete({"_id": ObjectID(req.body._id)}, (err, resultat) => {
  	console.log(util.inspect(req.body))
  if (err) return console.log(err)
    res.send(JSON.stringify(req.body))  // redirige vers la route qui affiche la collection
  })
})

app.post('/ajax_ajouter', (req, res) => {
  console.log('route /ajax_ajouter') 
  db.collection('adresse').save(req.body, (err, result) => {
    if (err) return console.log(err)
    // console.log(req.body) 
    console.log('sauvegarder dans la BD')
    res.send(JSON.stringify(req.body))
  })
})





