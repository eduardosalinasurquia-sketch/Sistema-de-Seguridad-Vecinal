var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var alertsRouter = require('./routes/alerts');
var relatedRouter = require('./routes/related');
var authRouter = require('./routes/auth');
var reportsRouter = require('./routes/reports');
var auth = require('./middleware/auth');
var db = require('./db');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  if (req.path === '/' || req.path === '/index') {
    var user = auth.userFromRequest(req);
    if (!user) return res.redirect('/login');
    req.authenticatedUser = user;
  }
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/alerts', auth.requireAuth, alertsRouter);
app.use('/api/auth', authRouter);
app.use('/api/reports', auth.requireAuth, reportsRouter);
app.use('/api', auth.requireAuth, relatedRouter);

// Initialize SQLite once when the application is loaded.
db.ready.catch(function(error) {
  console.error('No se pudo inicializar SQLite:', error);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  if (req.path.indexOf('/api/') === 0) return res.status(err.status || 500).json({ error: 'Error interno del servidor' });
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
