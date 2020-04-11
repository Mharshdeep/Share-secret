//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

var userName = "";

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyparser.urlencoded({extended: true}));

app.use(session({
  secret: "our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://ShareAdmin:test123@sharecluster-lvsjx.mongodb.net/usersDB" , {useNewUrlParser : true , autoIndex: false,useUnifiedTopology: true});
mongoose.set("useCreateIndex",true);
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: [String]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secret",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id,username:profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


passport.use(new FacebookStrategy({
    clientID: process.env.FB_ID,
    clientSecret: process.env.FB_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secret"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id,username:profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res) {
res.render("home");
});

app.get("/auth/google",passport.authenticate("google",{scope: ["profile"]}));

app.get("/auth/facebook",passport.authenticate("facebook",{scope: ["email"]}));

app.get("/login",function(req,res) {
res.render("login");
});

app.get("/auth/google/secret",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect screts page.
    res.redirect("/secrets");
  });

  app.get("/auth/facebook/secret",
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect screts page.
      res.redirect("/secrets");
    });

app.get("/register",function(req,res) {
res.render("register" , {email: userName});
userName = "";
});

app.get("/secrets",function(req,res) {
User.find({"secret": {$ne: null}},function(err,foundedusers) {
if(err){
  console.log(err);
}else{
  if(foundedusers){
    res.render("secrets", {userWithSecrets: foundedusers});
  }
}
});
});

app.get("/submit",function(req,res) {
  if(req.isAuthenticated()){res.render("submit");
  }else{
    res.redirect("/login");
  }
})

app.get("/logout",function(req,res) {
req.logout();
res.redirect("/");
});

app.post("/register",function(req,res) {
User.register({username: req.body.username},req.body.password,function(err,user) {
  if(err){
    console.log(err);
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req,res,function() {
res.redirect("/secrets");
});
  }

});
console.log(req.body.username);
});



app.post("/login",function(req,res) {
userName = req.body.username;
const xyz = req.body.username;
 const user = new User({
   username: req.body.username,
   password: req.body.password
 });

User.findOne({username: xyz},function(err,result) {
if(err){
  console.log(err);
}else{
  if(result){

    req.login(user,function(err) {
    if(err){
      console.log(err);
    }else{
      if(  passport.authenticate("local")){
      passport.authenticate("local")(req,res,function() {
    res.redirect("/secrets");
    });
    }else {
      res.send("wrong credentials");
    }

    }
    });
  }else{
    res.redirect("/register");
  }
}
})

  });

  app.post("/submit",function(req,res) {
  const submittedSecret = req.body.secret;

  User.findById(req.user.id,function(err,founduser) {
  if(err){
    console.log(err);
  }else{
    if(founduser){
      founduser.secret.push(submittedSecret);
      founduser.save(function() {
      res.redirect("/secrets");
    });
    }
  }
  });
  });

let port = process.env.PORT;
if (port="" || or port = null){
  port = 3000;
}
app.listen(process.env.PORT, function() {
console.log("server has started Successfully");
})
