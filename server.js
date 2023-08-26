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
});


app.post("/post-message", async (req,res) => {
    const requiredUser = await User.findOne({email: req.cookies["username"]})
    try {
        const message = req.body.message
        var a = message.split(""),
        n = a.length;
        for(var i = n - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        const decryptedMessage = a.join("");
        const newMessage = new Chat({
            name: requiredUser.name,
            message: decryptedMessage,
            realMessage: message
        })

        await newMessage.save()
        res.redirect("/")
    } catch (error) {
        console.log(error)
    }
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
                res.redirect('/');
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


const PORT = process.env.PORT || 3000;

app.listen(PORT, function(){
   console.log('Server started at port 3000');
});