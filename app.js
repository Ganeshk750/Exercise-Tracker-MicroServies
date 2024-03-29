const cors = require('cors');
const express = require('express');
const app = express();
const shortid = require('shortid');
const bodyParser = require('body-parser');
const dateformat = require('dateformat');
const mongoose = require('mongoose');

//set up DB connection
const connection = mongoose.connect('mongodb://localhost:27017/cmsDb', {useNewUrlParser: true, useUnifiedTopology: true });

const Schema = mongoose.Schema;

/* User Table */
var userSchema = new Schema({
    username: String,
    _id: String
});

/* Exerciese Table */
var ExerciseSchema = new Schema({
    username: String,
    description: String,
    duration: Number,
    date: Date
});

const ExerciseUser = mongoose.model('ExerciseUser', userSchema);
const Exercise = mongoose.model('Exercise', ExerciseSchema);


app.use(cors({optionsSuccessStatus: 200}));
app.use('/', express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.get('/', function(req, res){
    res.sendFile(__dirname+"/views/index.html");
});

/* First Post Api */
app.post('/api/exercise/new-user', function (req, res) {

    var username = req.body.username;
    
    //if username field was filled
    if (username) {

        //check if username exists
        ExerciseUser.findOne({ username: username }).then(user => {

            if (!user) {

                var newUserID = shortid.generate();

                //create user record
                var newUser = new ExerciseUser({
                    username: username,
                    _id: newUserID
                });

                //insert new user into db
                newUser.save(function (err) {
                    if (err) return console.log(err);

                    res.send({ username: username, _id: newUserID });
                });

            } else {
                res.send('username already taken');
            }

        }).catch(error => {
            console.log(error);
        });
    } 
    else {
        res.send('Path `username` is required.');
    }

});

/* Second Post Api */
app.post('/api/exercise/add', function(req, res){

    var uid = req.body.userId;
    var desc = req.body.description;
    var duration = req.body.duration;
    var date = req.body.date;

    //{"username":"ktest","_id":"BJkp5cLVE"}
    ExerciseUser.findOne({_id: uid}, 'username').then(user => {

        if(user){

            //check to see duration is a number
            duration = parseInt(duration);

            if(duration){

                //check date format
                if(date.match(/^\d{4}-\d{2}-\d{2}$/)){

                    date = new Date(date + ' EDT');

                    var newExercise = new Exercise({
                        username: user.username,
                        description: desc,
                        duration: duration,
                        date: date
                    });

                    newExercise.save(function(err){

                        if (err) console.log(err);

                        res.send({username: user.username, description: desc,
                        duration: duration, _id: uid, date: dateformat(date, 'ddd mmm dd yyyy')});
                    });

                }else {
                    res.send('Cast to Date failed for value "'+ req.body.date +'" at path "date"')
                }

            }else{
                res.send('Cast to Number failed for value "' + req.body.duration + '" at path "duration"')
            }

            
            
        }else {
            res.send('unknown _id');
        }
    }).catch(error => {
        console.log(error);
    });

});

/* Get Api */
app.get('/api/exercise/log', function(req, res){

    var uid = req.query.userId;
    var from = req.query.from;
    var to = req.query.to;
    var limit = parseInt(req.query.limit);

    ExerciseUser.findOne({_id: uid}).then(user => {

        if(user){

            var result = Exercise.where('username', user.username);

            if(from && from.match(/^\d{4}-\d{2}-\d{2}$/)){
                result = result.where('date').gte(new Date(from));
            }

            if(to && to.match(/^\d{4}-\d{2}-\d{2}$/)){
                result = result.where('date').lte(new Date(to));
            }

            if(limit){
                result = result.limit(limit);
            }
            
            result.exec(function(err, data){

                var arr = data.map(function(d){
                    return {description: d.description, duration: d.duration, date: dateformat(d.date, 'ddd mmm dd yyyy')}
                });

                res.send({_id: uid, username: user.username, count: data.length, 
                log: arr});
            });

        }else {
            res.send('unknown userId')
        }
    });

    

});

/*  Not found middleware */
app.use((req, res, next) => {
    return next({ status: 404, message: 'not found' })
});

/* Error Handling middleware */
app.use((err, req, res, next) => {
    let errCode, errMessage

    if (err.errors) {
        // mongoose validation error
        errCode = 400 // bad request
        const keys = Object.keys(err.errors)
        // report the first validation error
        errMessage = err.errors[keys[0]].message
    } else {
        // generic or custom error
        errCode = err.status || 500
        errMessage = err.message || 'Internal Server Error'
    }
    res.status(errCode).type('txt')
        .send(errMessage)
});

const port = process.env.PORT || 3000;
app.listen(port, () =>{
    console.log(`Server is running on port: ${port}`);
});

