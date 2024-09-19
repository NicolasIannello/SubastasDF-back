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

app.listen( process.env.PORT, () =>{
    console.log('Iniciando');
});