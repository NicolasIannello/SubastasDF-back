const { Schema, model } = require('mongoose');

const UsuarioSchema = Schema({
    nombre: { type: String, required: true },
    mail: { type: String, required: true },
    telefono: { type: String, required: true },
    cuil_cuit: { type: String, required: true },
    habilitado: { type: Boolean, required: true },
    pass: { type: String },
    actividad: { type: String, required: true },
    pais: { type: String, required: true },
    provincia: { type: String, required: true },
    ciudad: { type: String, required: true },
    postal: { type: String, required: true },
    domicilio: { type: String, required: true },
    tipo: { type: String, required: true },
    ultima_conexion: { type: String, required: true },
    validado: { type: Boolean, required: true },
    como_encontro: { type: String, required: true },
    grupo: { type: String },
});

UsuarioSchema.method('toJSON', function() {
    const { __v, _id,pass, ...object } = this.toObject();
    object.vid= _id;
    return object;
});

module.exports= model('Usuario',UsuarioSchema);