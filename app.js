import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import passport from 'passport';
import passportLocalMongoose from "passport-local-mongoose";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import * as findOrCreate from "mongoose-findorcreate";

const app = express();
const port = 3000;
const saltRounds = 10;

app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
    secret: 'VeryLongSuperSecretString.',
    resave: false,
    saveUninitialized: true
  }));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate.default);
//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = mongoose.model("User", userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user);
});
   
passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ['profile'] }));
  
app.get("/auth/google/secrets", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
    // Successful authentication, redirect home.
        res.redirect("/secrets");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/logout", (req, res) => {
    req.logout(function(err){
        if(err) { console.log(err);}
    });
    res.redirect("/");
});

app.get("/secrets", (req, res) => {
    User.find({"secret": {$ne:null}})
    .then((foundUser) => {
        res.render("secrets.ejs", {usersWithSecrets: foundUser});
    })
    .catch((err) => {console.log(err);});
});

app.get("/submit", (req, res) => {
    if(req.isAuthenticated()){
        res.render("submit.ejs");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;
    User.findById(req.user._id)
    .then((foundUser) => {
        foundUser.secret = submittedSecret;
        foundUser.save().then(() => {
            res.redirect("/secrets");
        });
    })
    .catch((err) => {console.log(err);})
});

app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            })
        }
    })
});

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            })
        }
    })
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`)
});
