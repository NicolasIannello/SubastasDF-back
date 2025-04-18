const { Schema, model } = require('mongoose');

const EmpresaSchema = Schema({
    mail: { type: String, required: true },
    persona_responsable: { type: String, required: true },
    razon_social: { type: String, required: true },
});

EmpresaSchema.method('toJSON', function() {
    const { __v, _id,pass, ...object } = this.toObject();
    object.vid= _id;
    return object;
});

module.exports= model('Empresa',EmpresaSchema);