//jshint esversion:6
require('dotenv').config(); //put this at the top
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const ejs = require("ejs");
const getDbConnection = require('./db')
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
require('https').globalAgent.options.rejectUnauthorized = false;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true}));


app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
  
}));

app.use(passport.initialize());
app.use(passport.session());


const db = getDbConnection();

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

//Add plugin
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)


userSchema.plugin(encrypt, { secret: process.env.SECRET,  encryptedFields: ['password'] });

const User = new mongoose.model("User",  userSchema);

passport.use(User.createStrategy());

// Used to serialize the user for the session
passport.serializeUser(function(user, done) {
  done(null, user.id);
  // The user.id will be stored in the session data
});

// Used to deserialize the user
passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:5500/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/", function(req, res){
    res.render("home");
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res){
    res.render("login");
});
app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res) {
  User.find({"secret": {$ne: null}})
    .then(foundUsers => {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    })
    .catch(err => {
      console.log(err);
    });
});


app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});
//change this to use promises
app.post("/submit", async function(req, res) {
  try {
    const submittedSecret = req.body.secret;
    const foundUser = await User.findById(req.user.id);

    if (foundUser) {
      foundUser.secret = submittedSecret;
      await foundUser.save();
      res.redirect("/secrets");
    }
  } catch (err) {
    console.log(err);
  }
});




app.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


  //using passport
  app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
      if(err){
        console.log(err);
        res.redirect("/register");
      }else{
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        })
      }
    })
  })
 

  app.post("/login", function(req,res){
    const user = new User({
      username: req.body.username,
      password:req.body.password
    });
    req.login(user, function(err){
      if(err){
        console.log(err);
      }else{
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        })
      }
    })
  });



app.listen (5500, function(){
    console.log("server started on port 5500");
});