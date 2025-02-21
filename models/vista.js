const { Schema, model } = require('mongoose');

const VistaSchema = Schema({
    uuid_evento: { type: String, require:true },
    uuid_lote: { type: String, require:true },
    mail: { type: String, require:true },
});

VistaSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports= model('Vista',VistaSchema);