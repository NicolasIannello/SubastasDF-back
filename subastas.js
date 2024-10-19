const express =require('express');
require('dotenv').config();
const cors=require('cors');
const { dbConnection } = require('./database/config');

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

app.listen( process.env.PORT, () =>{
    console.log('Iniciando');
});