const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const uuidv4 = require('uuid/v4');
const bodyParser = require('body-parser');
const express = require('express');
const parseForm = bodyParser.urlencoded({ extended: false });

const PORT = 34222;
const HOST = "0.0.0.0";
const app = express();

let customSessions = {}
let statusStorage = []

app.set('view engine', 'ejs');
app.use(cookieParser());

app.get('/login', async function (req, res) {
    const session = req.cookies['session'];
    const csrf = customSessions[session]
    if(session && customSessions[session]) {
        return res.render('secure', { csrf, statusStorage });
    }
    res.render('index')
});

app.get('/', function (req, res) {
    const session = req.cookies['session'];
    const csrf = customSessions[session]
    if(session && customSessions[session]) {
        res.render('secure', { csrf, statusStorage });
    } else {
        res.redirect('/login')
    }
});

app.post('/process', parseForm, async function (req, res) {
    const user = req.body.username;
    const password = req.body.password;
    if(user === 'admin' && password === 'admin') {
        const session = await createCSPRSG();
        const csrf = await createCSRF();
        customSessions[session] = csrf;
        const statuses = await getStatuses(session);
        res.setHeader('Set-Cookie',[`session=${session}; expires=${new Date().addDays(10).toUTCString()};samesite=strict;`]);
        res.render('secure', { csrf, statuses })
    } else {
        res.redirect('/login')
    }
});

app.get('/exchange', async function (req, res) {
    const session = req.cookies['session'];
    if(session && customSessions[session]) {
        res.status(200).json({ _csrf: customSessions[session]});
    } else {
        res.status(400).send()
    }
});

app.post('/', parseForm, async function (req, res) {
    const session = req.cookies['session'];
    const csrf = req.body._csrf;
    const status = req.body.status;
    if(session && customSessions[session] === csrf) {
        statusStorage.push({session: session, status: status});
        const statuses = await getStatuses(session);
        res.render('secure', { csrf, statuses})
    } else {
        res.redirect('/login')
    }
});

app.post('/logout', parseForm, async function (req, res) {
    const session = req.cookies['session'];
    if(session && customSessions[session]) {
        delete customSessions[session]
        res.redirect('/login')
    } else {
        res.redirect('/login')
    }
});

app.get('/logout', parseForm, async function (req, res) {
    res.redirect('/login')
});

async function createCSPRSG() {
    return await crypto.randomBytes(64).toString('hex');
}

async function createCSRF() {
    return uuidv4();
}

async function getStatuses(session) {
    let statusMesseges = []
    statusStorage.filter( s => {
         if(s.session === session){
             statusMesseges.push(s.status);
         }
    });
    return statusMesseges;
}

Date.prototype.addDays = function(days) {
    this.setDate(this.getDate() + parseInt(days));
    return this;
};

app.listen(PORT, HOST, e => {
    if(e) {
        throw e;
    }
    console.log(`Server started running at port ${PORT} on ${HOST}`);
});
