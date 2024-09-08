const { Schema, model } = require('mongoose');

const UsuarioSchema = Schema({
    nombre_apellido: { type: String, required: true },
    cuil_cuit: { type: String, required: true },
    telefono: { type: String, required: true },
    actividad: { type: String, required: true },
    como_encontro: { type: String, required: true },
    mail: { type: String, required: true },
    pass: { type: String },
    pais: { type: String, required: true },
    provincia: { type: String, required: true },
    ciudad: { type: String, required: true },
    postal: { type: String, required: true },
    domicilio: { type: String, required: true },
});

UsuarioSchema.method('toJSON', function() {
    const { __v, _id,pass, ...object } = this.toObject();
    object.vid= _id;
    return object;
});

module.exports= model('Usuario',UsuarioSchema);