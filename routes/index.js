var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express', user: req.authenticatedUser });
});

// Evita que una ruta alternativa permita saltarse el acceso al panel.
router.get('/index', function(req, res) { res.redirect('/'); });

router.get('/login', function(req, res) { res.render('login', { title: 'Iniciar sesión' }); });
router.get('/register', function(req, res) { res.render('register', { title: 'Crear cuenta' }); });

module.exports = router;
