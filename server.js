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
const File = require('./models/FileSchema');

const initializePassport = require("./passport");
initializePassport(
    passport,
    email => User.findOne({ email: email }),
    id => User.findById(id)
)


const app = express();
app.use(express.urlencoded({ extended: true }))
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
    return res.render("landing.ejs", { details });
});



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
            name: requiredUser.name,
            message: decryptedMessage,
            realMessage: message
        })

        await newMessage.save()
        res.redirect("/index")
    } catch (error) {
        console.log(error)
    }
});

app.get("/missions", (req, res) => {
    res.render("mission.ejs")
})

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads')
    },
    filename: function(req, file, cb) {

        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }

})
const upload = multer({
    storage: storage

})

app.get('/assignAgents',isAdmin,  async (req,res,next) => {
    res.render('mission.ejs');
})

app.get('/admin',isAdmin,  async (req,res,next) => {
    res.render('assign.ejs');
})

app.get('/missionAssigned',isAdmin,  async (req,res,next) => {
    res.render('missionInfo.ejs');
})

function isAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
      return next();
    } else {
      return res.status(403).json({ message: 'Permission denied' });
    }
}

  

app.post('/uploadmultiple', upload.array('files', 10), (req, res, next) => {
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
    
    let result = imgArray.map((src, index) => {

        let finalImg = {
            filename: files[index].originalname,
            contentType: files[index].mimetype,
            imageBase64: src
        }
        let newUpload = new File(finalImg);

        return newUpload
            .save()
            .then(() => {
                return{ msg:`${files[index].originalname} Uploaded Successfully...!`}
            })
            .catch((err) => {
                if(error){
                    if(error.name === 'MongoError' && error.code === 11000){
                        return Promise.reject({error:`Duplicate ${files[index].originalname}. File Already exists...!`})
                    }
                    return Promise.reject({error: error.message || `Cannot Upload ${files[index].originalname}`})
                }
            })
    })
    Promise.all(result)
        .then((msg) => {
            res.json(msg);
        })
        .catch((err) => {
            res.json(err);
        })
});

// app.get('', (req, res) => {
//     File.find({})
//     .then((data, err)=>{
//         if(err){
//             console.log(err);
//         }
//         res.render('imagepage',{items: data})
//     })
// });
// app.get('/files/:id', async (req, res) => {
//     try {
//       const file = await File.find(req.params.id);
  
//       if (!file) {
//         return res.status(404).send('File not found');
//       }
//       // Determine the content type based on your data or file type detection logic
//     const contentType = 'image/png'; // Default to binary data

//     // Set appropriate content type for the response
//     res.contentType(contentType);

//     // Decode base64 to binary
//     const fileBuffer = Buffer.from(file.data, 'base64');

//     // Serve the file
//     res.send(fileBuffer);
//     } catch (error) {
//       console.error(error);
//       console.log("L")
//       res.status(500).send('Server Error');
//     }
//   });

app.post("/upload", upload.single("file"), async (req, res) => {    
    const fileData = {
      path: req.file.path,
      originalName: req.file.originalname,
    }
    if (req.body.password != null && req.body.password !== "") {
      fileData.password = await bcrypt.hash(req.body.password, 10)
    }
  
    const file = await File.create(fileData)
  
    return res.render("upload.ejs", { fileLink: `${req.headers.origin}/file/${file.id}` })
  })
  
  app.route("/file/:id").get(handleDownload).post(handleDownload)
  
  async function handleDownload(req, res) {
    const file = await File.findById(req.params.id)
  
    if (file.password != null) {
      if (req.body.password == null) {
        res.render("password.ejs")
        return
      }
  
      if (!(await bcrypt.compare(req.body.password, file.password))) {
        res.render("password.ejs", { error: true })
        return
      }
    }
  
    await file.save()
  
    res.download(file.path, file.originalName)
  }

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

app.get("/123", (req,res) => {
    res.render("test.ejs");

});

app.get("/portal",checkNotVerified,checkAuthenticated, (req,res) => {
    res.render("portal.ejs");
});

app.post("/profile", upload.single('img'), (req, res) =>{
    console.log(req.file);
    console.log(req.body);
    return res.redirect("/")
});

app.get("/index",checkAuthenticated, async (req,res) => {
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

app.get("/upload", async (req,res) => {
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



const PORT = process.env.PORT || 3000;

app.listen(PORT, function(){
   console.log('Server started at port 3000');
});