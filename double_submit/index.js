const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const uuidv4 = require('uuid/v4');
const bodyParser = require('body-parser');
const express = require('express');
const parseForm = bodyParser.urlencoded({ extended: false });

const PORT = 31333;
const HOST = "0.0.0.0";
const app = express();

// let customSessions = {}
let statusStorage = []

app.set('view engine', 'ejs');
app.use(cookieParser());

app.get('/login', async function (req, res) {
    const sessionFromHeader = req.cookies['session'];
    const csrf = req.cookies['csrf'];
    const statuses = await getStatuses(sessionFromHeader);
    if(csrf && sessionFromHeader) {
        return res.render('secure', { csrf, statuses });
    }
    res.render('index')
});

app.get('/', async function (req, res) {
    const session = req.cookies['session'];
    const csrf = req.cookies['csrf'];
    if(session && csrf) {
        const statuses = await getStatuses(session);
        res.render('secure', { csrf, statuses });
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
        // customSessions[session] = csrf;
        const statuses = await getStatuses(session);
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
