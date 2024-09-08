const { Schema, model } = require('mongoose');

const ViejosSchema = Schema({
    nombre: { type: String, required: true },
    cuil_cuit: { type: String, required: true },
    telefono: { type: String, required: true },
    mail: { type: String, required: true },
    habilitado: { type: Boolean, required: true },
    pass: { type: String },
    actividad: { type: String },
    pais: { type: String, required: true },
    provincia: { type: String, required: true },
    ciudad: { type: String, required: true },
    postal: { type: String, required: true },
    domicilio: { type: String, required: true },
});

ViejosSchema.method('toJSON', function() {
    const { __v, _id,pass, ...object } = this.toObject();
    object.vid= _id;
    return object;
});

module.exports= model('Viejos',ViejosSchema);