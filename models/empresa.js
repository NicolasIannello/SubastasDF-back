const { Schema, model } = require('mongoose');

const EmpresaSchema = Schema({
    user_id: { type: String, required: true },
    nombre_comercial: { type: String, required: true },
    razon_social: { type: String, required: true },
});

EmpresaSchema.method('toJSON', function() {
    const { __v, _id,pass, ...object } = this.toObject();
    object.vid= _id;
    return object;
});

module.exports= model('Empresa',EmpresaSchema);