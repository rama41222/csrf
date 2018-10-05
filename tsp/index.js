const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const bodyParser = require('body-parser');
const express = require('express');
const PORT = 3000;
const HOST = "0.0.0.0";
const csrfProtection = csrf({ cookie: true })
const parseForm = bodyParser.urlencoded({ extended: false })
const app = express();

app.set('view engine', 'ejs');
app.use(cookieParser());

app.get('/', csrfProtection, function (req, res) {
    res.render('index', { csrfToken: req.csrfToken() })
});

app.post('/process', parseForm, csrfProtection, function (req, res) {
    console.log(req.body.mind);
    console.log(req.body._csrf);
    res.send('data is being processed')
});

app.listen(PORT, HOST, e => {
    if(e) {
        throw e;
    }
    console.log(`Server started running at port ${PORT} on ${HOST}`);
});
