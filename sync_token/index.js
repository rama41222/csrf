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

app.set('view engine', 'ejs');
app.use(cookieParser());

app.use(function (req, res, next) {
    req.sessionFromHeader = req.cookies['session'];
    req.csrf = req.cookies['csrf'];
    req.isSecure = req.cookies['session'] && req.cookies['csrf'];
});

app.get('/login', function (req, res) {
    if(req.isSecure) {
        const statuses = getStatuses(sessionFromHeader);
        return res.render('secure', { csrf: req.csrf, statuses });
    }
    res.render('index');
});

app.get('/', function (req, res) {
    if(req.isSecure) {
        const statuses = getStatuses(session);
        return res.render('secure', { csrf: req.csrf, statuses });
    }
    res.redirect('/login');
});

app.post('/process', parseForm, async function (req, res) {
    const user = req.body.username;
    const password = req.body.password;

    if(user === 'admin' && password === 'admin') {
        const session = await createCSPRSG();
        const csrf = await createCSRF();
        // customSessions[session] = csrf;
        const statuses = getStatuses(session);
        res.setHeader('Set-Cookie',[`session=${session}; expires=${new Date().addDays(10).toUTCString()};samesite=strict;HttpOnly;`,
            `csrf=${csrf}; expires=${new Date().addDays(10).toUTCString()};samesite=strict;HttpOnly;`]);
        res.render('secure', { csrf, statuses })
    } else {
        res.redirect('/login')
    }
});


app.post('/', parseForm, async function (req, res) {
    const sessionFromHeader = req.cookies['session'];
    const csrfFromHeader = req.cookies['csrf'];
    const csrf = req.body._csrf;
    const status = req.body.status;
    if(csrf && sessionFromHeader && csrfFromHeader && csrfFromHeader === csrf) {
        statusStorage.push({session: sessionFromHeader, status: status});
        const statuses = await getStatuses(sessionFromHeader);
        res.render('secure', { csrf, statuses })
    } else {
        res.redirect('/login')
    }
});

app.post('/logout', parseForm, async function (req, res) {
    res.clearCookie("session");
    res.clearCookie("csrf");
    res.redirect('/login');
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

function getStatuses(session) {
    return statusStorage.filter( s => s.session === session);
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
