import 'dotenv/config';
import express from "express";
import mongoose from "mongoose";
//import encrypt from "mongoose-encryption";
//import md5 from 'md5';
import bcrypt from "bcrypt";

const app = express();
const port = 3000;
const saltRounds = 10;

app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.post("/register", (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        const newUser = new User({
            email: req.body.username,
            //password: md5(req.body.password)
            password: req.body.password
        });
        newUser.save()
        .then(() => {res.render("secrets.ejs"); })
        .catch((error) => {console.log(error); });
    });
});

app.post("/login", (req, res) => {
    const username = req.body.username;
    //const password = md5(req.body.password);
    const password = req.body.password;
    User.findOne({email: username}).exec()
    .then((foundUser) => {
        if(foundUser){ 
            // if(foundUser.password === password){
            //     res.render("secrets.ejs");
            // }
            bcrypt.compare(password, foundUser.password).then(function(result) {
                if(result === true) {
                    res.render("secrets.ejs");
                }
            });
        }
    })
    .catch((error) => {console.log(error);});
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`)
});
