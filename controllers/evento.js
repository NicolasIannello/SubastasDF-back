const { response }=require('express');
const { v4: uuidv4 }=require('uuid');
const { isAdmin, isAdmin2 } = require('./admin');
const Evento = require('../models/evento');
const EventoLote = require('../models/evento-lote');
const Lote = require('../models/lote');
const { subirImagen, borrarImagen } = require('../helpers/imagenes');
const Imagen = require('../models/imagen');
const fs=require('fs');
const Usuario = require('../models/usuario');
const Favorito = require('../models/favorito');
const OfertaAuto = require('../models/oferta-auto');
const Vista = require('../models/vista');
const Oferta = require('../models/oferta');
const PDF = require('../models/pdf');

const crearEvento= async(req,res = response) =>{
    try {
        if(await isAdmin(res,req.uid)){
               
            const evento= new Evento(req.body);
            evento.home=false;
            evento.eventos=false;
            evento.visitas=0;
            evento.estado=0;
            evento.uuid=uuidv4();
            await evento.save();  

            res.json({
                ok:true,
                uuid:evento.uuid
            });
            
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
};

const getEventos= async(req,res = response) =>{
    if(await isAdmin(res,req.uid)){
        const desde= parseInt(req.query.desde) || 0;
        const limit= parseInt(req.query.limit) || 20;
        const orden= parseInt(req.query.orden) || 1;
        const order= req.query.order || '_id';
        var sortOperator = { "$sort": { } };
        sortOperator["$sort"][order] = orden;

        const [ eventos, total ]= await Promise.all([
            Evento.aggregate([
                { $project: { __v: 0, } },
                sortOperator,
                { $skip: desde },
                { $limit: limit },
                { $lookup: {
                    from: "eventolotes",
                    localField: "uuid",
                    foreignField: "uuid_evento",
                    as: "lotes"
                } },
                { $project: {
                    __v: 0,
                    "lotes.__v": 0,
                    "lotes._id": 0,
                    "lotes.uuid_evento": 0, "lote.visitas": 0 
                } },
                { $lookup: {
                    from: "imagens",
                    localField: "uuid",
                    foreignField: "lote",
                    as: "img"
                } },
                {$unwind: { path: "$img", preserveNullAndEmptyArrays: true }},
                { $project: { __v: 0, "img.orden": 0, "img._id": 0, "img.lote": 0, } },    
            ]).collation({locale: 'en'}),
            Evento.countDocuments()
        ]);        
        
        res.json({
            ok:true,
            eventos,
            total
        });
    }
};

const agregarLotes= async(req,res = response) =>{
    if(await isAdmin(res,req.uid)){
        for (let i = 0; i < req.body.lotes.length; i++) {
            const eventoDB = await Evento.find({uuid: req.body.evento})
            const loteEventoDB = await EventoLote.find({uuid_lote: req.body.lotes[i]})
            if(loteEventoDB.length==0){
                const eventoLote = new EventoLote({uuid_lote:req.body.lotes[i], uuid_evento:req.body.evento})
                eventoLote.save();
                const loteDB= await Lote.find({uuid:req.body.lotes[i]});
                const {...campos}=loteDB[0];
                campos._doc.disponible=false;
                if(eventoDB[0].modalidad=='Remate') campos._doc.extension=false;
                if(eventoDB[0].estado=1){
                    const loteEventoDB2 = await EventoLote.find({uuid_evento: eventoDB[0].uuid})
                    let dateFin= new Date(Date.parse(eventoDB[0].fecha_cierre+' '+eventoDB[0].hora_cierre));
                    dateFin.setMinutes(dateFin.getMinutes() + (eventoDB[0].segundos_cierre/60)*(loteEventoDB2.length))

                    fecha_nueva=new Date(dateFin).toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires", hour12: false}).split("/");
                    hora_nueva=fecha_nueva[2].slice(6,14)
                    fecha_nueva[2].slice(0,4)
                    hora_nueva2 = hora_nueva.split(":")
                    hora_nueva=(hora_nueva2[0]=='24'?"00":hora_nueva2[0])+":"+hora_nueva2[1];

                    campos._doc.hora_cierre=hora_nueva;
                    campos._doc.fecha_cierre=fecha_nueva[2].slice(0,4)+'-'+(fecha_nueva[0].length==1 ? '0'+fecha_nueva[0] : fecha_nueva[0])+'-'+(fecha_nueva[1].length==1 ? '0'+fecha_nueva[1] : fecha_nueva[1]);
                    campos._doc.estado=1;
                }
                await Lote.findByIdAndUpdate(loteDB[0]._id, campos,{new:true}); 
            }
        }
        
        res.json({
            ok:true,
        });
    }
};

const quitarLote= async(req,res = response) =>{
    if(await isAdmin(res,req.uid)){
        await EventoLote.deleteMany({uuid_lote: { $eq: req.body.lote}})
        await Oferta.deleteMany({uuid_lote: { $eq: req.body.lote}})
        await OfertaAuto.deleteMany({uuid_lote: { $eq: req.body.lote}})
        await Favorito.deleteMany({uuid_lote: { $eq: req.body.lote}})
        const loteDB= await Lote.find({uuid:req.body.lote});
        const {...campos}=loteDB[0];
        campos._doc.disponible=true;
        campos._doc.hora_cierre='';
        campos._doc.fecha_cierre='';
        campos._doc.estado=0;
        campos._doc.extension=true;
        campos._doc.ganador='';
        campos._doc.precio_ganador='';
        campos._doc.adjudicacion='';
        await Lote.findByIdAndUpdate(loteDB[0]._id, campos,{new:true}); 

        res.json({
            ok:true,
        });
    }
};

const getEvento= async(req,res = response) =>{
        let flagVistas=false;
        var matchOperator = { "$match": { } };
        var matchOperator2={ "$match": { 'grupo': { $exists: true } } };
        var matchOperator3={ "$match": { 'modalidad': { $exists: true } } };  
        var matchOperator4={ "$match": { 'estado': { $exists: true } } };  

        switch (await isAdmin2(req.uid)) {
            case 1:
                matchOperator['$match']['uuid'] = req.body.dato
                break;
            case 2:
                if(req.body.flag){
                    matchOperator['$match'][req.body.dato] = true
                }else{
                    matchOperator['$match']['uuid'] = req.body.dato
                    flagVistas=true;    
                }
                const userDB = await Usuario.findById(req.uid);        
                matchOperator2['$match']['grupo'] = (userDB.grupo=='general'? { $exists: true } : userDB.grupo);
                matchOperator3['$match']['modalidad'] = req.body.modalidad=='' ? { $exists: true } : req.body.modalidad;
                matchOperator4['$match']['estado'] = req.body.estado=='' ? { $exists: true } : req.body.estado;                
                break;
            case 3:
                res.json({
                    ok:false,
                    t:3
                });
                return;
        }

        const userDB = await Usuario.findById(req.uid);        

        const evento= await Evento.aggregate([
            matchOperator,
            matchOperator2,
            matchOperator3,
            matchOperator4,
            { $project: { __v: 0, } },
            { $lookup: {
                from: "eventolotes",
                localField: "uuid",
                foreignField: "uuid_evento",
                "pipeline": [ 
                    { "$sort" : { "uuid_lote" : -1 } },
                ],
                as: "lotes"
            } },
            { $project: {
                __v: 0,
                "lotes.__v": 0,
                "lotes._id": 0,
                "lotes.uuid_evento": 0,
            } },
            { $lookup: {
                from: "imagens",
                localField: "uuid",
                foreignField: "lote",
                as: "img"
            } },
            {$unwind: { path: "$img", preserveNullAndEmptyArrays: true }},
            { $project: { __v: 0, "img.orden": 0, "img._id": 0, "img.lote": 0, } },    
            { $lookup: {
                from: "vistas",
                localField: "uuid",
                foreignField: "uuid_evento",
                pipeline: [
                    { "$sort" : { "uuid_lote" : -1 } },
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ['$mail', userDB ? userDB.mail : 'dsad'] },
                          ]
                        }
                      }
                    }
                ],
                as: "vistas"
            } },
            { $project: { "vistas.__v": 0, "vistas.uuid_evento": 0, "vistas.mail": 0, "vistas._id": 0, } },
            { $lookup: {
                from: "ofertas",
                localField: "uuid",
                foreignField: "uuid_evento",
                pipeline: [
                    { "$sort" : { "uuid_lote" : -1 } },
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ['$mail', userDB ? userDB.mail : 'dsad'] },
                          ]
                        }
                      }
                    },
                    { $group: { _id: "$uuid_lote", uuid_lote : { $first: '$uuid_lote' }, oferta: { $max: "$cantidad" } } }
                ],
                as: "ofertas"
            } },
            { $project: { "ofertas.__v": 0, "ofertas.uuid_evento": 0, "ofertas.mail": 0, "ofertas._id": 0, "ofertas.cantidad": 0, "ofertas.tipo": 0, "ofertas.fecha": 0 } },
        ]).collation({locale: 'en'});
        
        if(flagVistas){
            let {lotes, img, ...campos}=evento[0];    
            campos.visitas+=1;    
            await Evento.findByIdAndUpdate(evento[0]._id, campos,{new:true});    
        }

        if(evento.length!=0 && evento[0].estado==0 && await isAdmin2(req.uid)==2 && !req.body.flag){
            res.json({
                ok:false,
                t: evento[0].estado==0 ? 4 : 5 
            });
            return;
        }

        res.json({
            ok:true,
            evento,
            t:0
        });
};

const actualizarEvento= async(req,res=response)=>{    
    if(await isAdmin(res,req.uid)){        
        const eventoDB= await Evento.find({uuid:req.body.uuid});
        if(!eventoDB){
            res.json({
                ok:false
            })
        }
        
        let {...campos}=eventoDB[0];        
        campos=req.body.campos;
        await Evento.findByIdAndUpdate(eventoDB[0]._id, campos,{new:true}); 
        
        res.json({
            ok:true,
        })
    }
}

const imgEvento= async(req,res = response) =>{
    try {
        if(await isAdmin(res,req.uid)){
            if(req.body.caso=='edit'){
                await borrarImagen(req.body.uuid,'eventos')
                subirImagen(req.files['img'],req.body.uuid,-1,res)
            }
            if(req.body.caso=='nuevo'){
                subirImagen(req.files['img'],req.body.uuid,-1,res)
                
                const pdf=req.files['pdf']
                const nombreCortado=pdf.name.split('.');
                const extensionArchivo=nombreCortado[nombreCortado.length-1];
                const nombreArchivo= uuidv4()+'.'+extensionArchivo;
                const path= './files/pdfs/'+nombreArchivo;
                const datos={ name: nombreCortado[0], pdf: nombreArchivo };

                pdf.mv(path, async (err)=>{
                    if(err){
                        console.log(err);
                        return res.status(500).json({
                            ok:false,
                            msg:'error en carga de archivo: '+nombreCortado[0],
                        })
                    }
                    const pdfFile = new PDF(datos)
                    await pdfFile.save();
                    
                    const eventoDB= await Evento.find({uuid:req.body.uuid});
                    let {...campos}=eventoDB[0];        
                    campos._doc.terminos_condiciones=pdfFile.pdf;
                    await Evento.findByIdAndUpdate(eventoDB[0]._id, campos,{new:true}); 
                })            
            }
            if(req.body.caso=='pdf'){
                const eventoDB= await Evento.find({uuid:req.body.uuid});
                let pathPDF='./files/pdfs/'+eventoDB[0].terminos_condiciones;
                const pdfDB= await PDF.find({pdf:eventoDB[0].terminos_condiciones});        
                
                const pdf=req.files['pdf']
                const nombreCortado=pdf.name.split('.');
                const extensionArchivo=nombreCortado[nombreCortado.length-1];
                const nombreArchivo= uuidv4()+'.'+extensionArchivo;
                const path= './files/pdfs/'+nombreArchivo;
                const datos={ name: nombreCortado[0], pdf: nombreArchivo };

                pdf.mv(path, async (err)=>{
                    if(err){
                        console.log(err);
                        return res.status(500).json({
                            ok:false,
                            msg:'error en carga de pdf: '+nombreCortado[0],
                        })
                    }
                    const pdfFile = new PDF(datos)
                    await pdfFile.save();
                    let {...camposL}=eventoDB;        
                    camposL=req.body;
                    camposL.terminos_condiciones= pdfFile.pdf;
                    if(fs.existsSync(pathPDF)) fs.unlinkSync(pathPDF);
                    await PDF.findByIdAndDelete(pdfDB[0]._id);
                    await Evento.findByIdAndUpdate(eventoDB[0]._id, camposL,{new:true}); 
                })    
            }

            res.json({
                ok:true,
            });
            
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
};

const eliminarEvento=async(req,res=response) =>{
    const uuid=req.body.uuid;
    try {        
        if(await isAdmin(res,req.uid)){
            const eventoDB = await Evento.find({uuid})
            const imgDB = await Imagen.find({lote:uuid})
            const evloDB = await EventoLote.find({uuid_evento:uuid})

            if(evloDB.length!=0){
                for (let i = 0; i < evloDB.length; i++) {
                    const loteDB= await Lote.find({uuid:evloDB[i].uuid_lote});
                    const {...campos}=loteDB[0];
                    campos._doc.disponible=true;
                    campos._doc.hora_cierre='';
                    campos._doc.fecha_cierre='';
                    campos._doc.estado=0;
                    await Lote.findByIdAndUpdate(loteDB[0]._id, campos,{new:true}); 
                }
            }
            await EventoLote.deleteMany({uuid_evento: { $eq: uuid}})
            if(imgDB.length!=0){
                for (let i = 0; i < imgDB.length; i++) {
                    let pathImg='./files/eventos/'+imgDB[i].img
                    if(fs.existsSync(pathImg)) fs.unlinkSync(pathImg);
                    await Imagen.findByIdAndDelete(imgDB[i]._id);
                }
            }
            const pdfDB = await PDF.find({pdf:eventoDB[0].terminos_condiciones})
            if(pdfDB.length!=0){
                let pathPDF='./files/pdfs/'+pdfDB[0].pdf;
                if(fs.existsSync(pathPDF)) fs.unlinkSync(pathPDF);
                await PDF.findByIdAndDelete(pdfDB[0]._id);    
            }
            await Favorito.deleteMany({uuid_evento:eventoDB[0].uuid});
            await OfertaAuto.deleteMany({uuid_evento:eventoDB[0].uuid});
            await Oferta.deleteMany({uuid_evento:eventoDB[0].uuid});
            await Vista.deleteMany({uuid_evento:eventoDB[0].uuid});
            await EventoLote.deleteMany({uuid_evento:eventoDB[0].uuid});
            await Evento.findByIdAndDelete(eventoDB[0]._id);

            res.json({
                ok:true,
            })
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error borrar'
        });
    }
};


module.exports={ crearEvento, getEventos, agregarLotes, quitarLote, getEvento, actualizarEvento, imgEvento, eliminarEvento }