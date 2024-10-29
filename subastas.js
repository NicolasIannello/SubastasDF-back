const express =require('express');
require('dotenv').config();
const cors=require('cors');
const { dbConnection } = require('./database/config');
const http = require('http');
const { socketConnection } = require('./helpers/socket-io');

const app=express();

app.use(cors());

app.use( express.json() );

dbConnection();

app.use('/subasta/usuarios', require('./routes/usuarios'));
app.use('/subasta/admin', require('./routes/admins'));
app.use('/subasta/web', require('./routes/webs'));
app.use('/subasta/lote', require('./routes/lotes'));
app.use('/subasta/evento', require('./routes/eventos'));
app.use('/subasta/oferta', require('./routes/ofertas'));

const server = http.createServer(app);
socketConnection(server);

server.listen( process.env.PORT, () =>{
    console.log('Iniciando');
});