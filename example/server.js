var connect = require('connect');
var easyapi = require('../easyapi');

var app = connect.createServer();
app.use(connect.query());
app.use(easyapi.middleware(__dirname + '/resources'));
app.listen(3000);

console.log('Server listening on port 3000');
