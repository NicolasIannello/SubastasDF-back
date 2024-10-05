const { Schema, model } = require('mongoose');

const EventoLoteSchema = Schema({
    uuid_evento: { type: String, required: true },
    uuid_lote: { type: String, required: true },
});

EventoLoteSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports= model('EventoLote',EventoLoteSchema);