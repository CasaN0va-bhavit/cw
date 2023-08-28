require('dotenv').config()
const express = require('express');
const bcrypt = require("bcrypt")
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const methodOverride = require('method-override')
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
var verified = false;
const route = require('express').Router();


var validator = require("node-email-validation");

mongoose.connect("mongodb+srv://bhavitgrover:c7Yxq8IEGeaZSYh7@login.ly7rioo.mongodb.net/?retryWrites=true&w=majority")
.then(() => {
    console.log("Mongo Connected");
})
.catch(() => {
    console.log("failed you loser");
})

const User = require('./models/Schema');
const Chat = require('./models/ChatSchema');
const File = require('./models/UploadSchema');

const initializePassport = require("./passport");
initializePassport(
    passport,
    email => User.findOne({ email: email }),
    id => User.findById(id)
)


const app = express();
app.use(express.urlencoded({ extended: false }))
app.set("view-engine", "ejs")
app.set('views', 'views')
app.use(cookieParser())
app.use(express.json())
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    cookie: {
        maxAge: 60000 * 60 * 24
    },
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))
app.use(express.static('public'))

app.get("/", async (req, res) => {
    const messages = await Chat.find();
    const files = await File.find();
    const details = messages
        .map((message) => {
            try {
                return {
                    "name": message.name,
                    "message": message.message,
                    "realMessage": message.realMessage
                };
            } catch (error) {
                return null;
            }
        })
        .filter((detail) => detail !== null);
    console.log(details);
    return res.render("landing.ejs", { details });
});


app.get("/files", (req, res) => {
    return res.render("files.ejs", { details });
})

app.post("/post-message", async (req,res) => {
    const requiredUser = await User.findOne({email: req.cookies["username"]})
    try {
        const message = req.body.message
        var decryptedMessage = "";
        const words = message.split(" ")
        for (var i = 0; i < words.length; i ++) {
            try {
                var response = await fetch(`http://www.anagramica.com/all/${words[i]}`)
                var data = await response.json()
                console.log(data)
                decryptedMessage = decryptedMessage + " " +data.all[0]
            }
            catch {
                decryptedMessage = decryptedMessage + " " + words[i]
            }
        }
        // YAHA PAR THEEK KARNA H
        const newMessage = new Chat({
            name: "bha",
            message: decryptedMessage,
            realMessage: message
        })

        await newMessage.save()
        res.redirect("/")
    } catch (error) {
        console.log(error)
    }
});

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        var ext = file.originalname.substring(file.originalname.lastIndexOf('.'));
        cb(null, file.fieldname + '-' + Date.now() + ext)
    }
})
const store = multer({
    storage: storage

})

app.post('/uploadmultiple', store.array('images', 10), (req, res, next) => {
    const files = req.files;

    if (!files) {
        const error = new Error('Please choose files');
        error.httpStatusCode = 400;
        return next(error);
    }

    let imgArray = files.map((file) => {
        let img = fs.readFileSync(file.path);
        return encode_image = img.toString('base64');

    })
    
    let result = imgArray.map(async (src, index, images) => {

        let finalImg = {
            filename: files[index].originalname,
            contentType: files[index].mimetype,
            imageBase64: src
        }
        let newUpload = new File(finalImg);

        try {
            await newUpload
                .save();
            return { msg: `${files[index].originalname} Uploaded Successfully...!` };
            res.redirect('/index');
        } catch (err) {
            if (err) {
                if (err.name === 'MongoError' && error.code === 11000) {
                    return Promise.reject({ error: `Duplicate ${files[index].originalname}. File Already exists...!` });
                }
                return Promise.reject({ error: err.message || `Cannot Upload ${files[index].originalname}` });
            }
        }
    })   
    Promise.all(result)
        .then((msg) => {
            res.json(msg);
        })
        .catch((err) => {
            res.json(err);
        })
});

app.get('/getfiles/:id', async(req,res) =>{
    const file = await File.find(req.params.id);
    res.send(file);
})

app.post("/submit", (req, res) => {
    const data = req.body; 
    const isActive = data.isActive;
    console.log('Received boolean value:', isActive);
    verified = true
    if(isActive){
        console.log("redirected");
        return res.redirect("/portal");
    }
    
    else{
        res.send("affa")
    }
});

app.get("/verify", (req,res) => {
    res.render("verify.ejs");

});

app.get("/portal",checkNotVerified, (req,res) => {
    res.render("portal.ejs");
});

app.post("/profile", store.single('formFile'), (req, res) =>{
    console.log(req.file);
    console.log(req.body);
    return res.redirect("/")
});

app.get("/index", async (req,res) => {
    const messages = await Chat.find();
    const details = messages
        .map((message) => {
            try {
                return {
                    "name": message.name,
                    "message": message.message,
                    "realMessage": message.realMessage
                };
            } catch (error) {
                return null;
            }
        })
        .filter((detail) => detail !== null);

    console.log(details);
    return res.render("index.ejs", { details });
})

app.get("/login", checkNotAuthenticated, (req,res) => {
    res.render("login.ejs")
});

app.post("/login", (req, res, next) => {
    loginUser(req, res, next)
})

app.get("/signup", checkNotAuthenticated, (req,res) => {
    res.render("signup.ejs")
});

app.post('/logout', checkAuthenticated, (req, res) => {
    req.logout((err) => {
        if (err) {
            
        }
    })
    res.clearCookie('username')
    res.redirect('/login');
});

app.post("/signup", async (req, res) => {
    if (!req.body.username || !req.body.email || !req.body.password) {
        res.send("Email or password or username missing.")
    }
    else {
        // const validOrNot = validator.is_email_valid(req.body.email);
        const validOrNot = true;
        const requiredUser = await User.findOne({name: req.body.username})
        if (validOrNot && requiredUser) {
            try {
                const hashedPassword = await bcrypt.hash(req.body.password, 10);
                const newUser = new User({
                    name: req.body.username,
                    email: req.body.email,
                    password: hashedPassword,
                });
                
                await newUser.save();
                console.log(newUser);
                res.redirect('/login');
            } catch (error) {
                console.log(error);
                res.redirect('/signup');
            }
        }
        else {
            res.send("Enter a valid email or this user already exists.")
        }
    }
})

function loginUser(req, res, next) {
    passport.authenticate('local', (err, user, info) => {
        if (err) throw err;
        if (!user) req.flash('error', `${info.message}.`);
        else {
            req.logIn(user, (err) => {
                if (err) throw err;
                res.cookie("username", user.email)
                res.redirect('/verify');
            });
        }
    })(req, res, next);
}

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }


    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }

    next()
}

function checkNotVerified(req, res, next) {
    if (verified === false) {
        return res.redirect('/verify')
    }

    next()
}

module.exports = route;

const PORT = process.env.PORT || 3000;

app.listen(PORT, function(){
   console.log('Server started at port 3000');
});
