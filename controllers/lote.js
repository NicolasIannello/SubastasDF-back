const { response }=require('express');
const Lote = require('../models/lote');
const PDF = require('../models/pdf');
const fs=require('fs');
const { v4: uuidv4 }=require('uuid');
const { isAdmin, isAdmin2 } = require('./admin');
const Imagen = require('../models/imagen');
const path=require('path');
const { subirImagen, borrarImagen } = require('../helpers/imagenes');
const eventoLote = require('../models/evento-lote');
const evento = require('../models/evento');
const Usuario = require('../models/usuario');
const Favorito = require('../models/favorito');
const Oferta = require('../models/oferta');

const crearLote= async(req,res = response) =>{
    try {
        if(await isAdmin(res,req.uid)){
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
                const lote= new Lote(req.body);
                lote.disponible=true;
                lote.terminos_condiciones=pdfFile.pdf;
                lote.uuid=uuidv4();
                lote.ganador='';
                lote.precio_ganador='';
                lote.visitas=0;
                await lote.save();  

                if(req.files['img'].length==undefined){
                    subirImagen(req.files['img'],lote.uuid,1,res)
                }else{
                    for (let i = 0; i < req.files['img'].length; i++) {
                        for (let j = 0; j < req.body.imgOrden.length; j++) {
                            if(req.body.imgOrden[j]==req.files['img'][i].name){
                                subirImagen(req.files['img'][i],lote.uuid,(j+1),res)
                            }
                        }
                    };
                }
            })            

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

const getLotes= async(req,res = response) =>{
    if(await isAdmin(res,req.uid)){
        const desde= parseInt(req.query.desde) || 0;
        const limit= parseInt(req.query.limit) || 20;
        const orden= parseInt(req.query.orden) || 1;
        const order= req.query.order || '_id';
        const disp= req.query.disp=='true' ? true : {$exists: true};
        var sortOperator = { "$sort": { } };
        sortOperator["$sort"][order] = orden;
        var matchOperator = { "$match": { "disponible": disp } }

        const [ lotes, total ]= await Promise.all([
            Lote.aggregate([
                matchOperator,
                { $project: {
                    __v: 0,
                    "descripcion": 0,
                    "aclaracion": 0,
                    "terminos_condiciones": 0,
                } },
                sortOperator,
                { $lookup: {
                    from: "ofertas",
                    localField: "uuid",
                    foreignField: "uuid_lote",
                    "pipeline": [ 
                        { "$sort" : { "cantidad" : -1 } },
                        { "$limit" : 1 } 
                    ],
                    as: "oferta"
                } },
                {$unwind: { path: "$oferta", preserveNullAndEmptyArrays: true }},
                { $lookup: {
                    from: "ofertas",
                    localField: "uuid",
                    foreignField: "uuid_lote",
                    as: "ofertas"
                } },
                { $skip: desde },
                { $limit: limit },
            ]).collation({locale: 'en'}),
            Lote.countDocuments()
        ]); 
        
        res.json({
            ok:true,
            lotes,
            total
        });
    }
};

const lote= async(req,res = response) =>{    
    //if(await isAdmin(res,req.uid)){
        const lote = await Lote.aggregate([
            { "$match": { uuid:req.body.uuid } },
            { $project: { __v: 0, '_id':0 } },
            { $lookup: {
                from: "pdfs",
                localField: "terminos_condiciones",
                foreignField: "pdf",
                as: "pdf"
            } },
            {$unwind: { path: "$pdf", preserveNullAndEmptyArrays: true }},
            { $project: { __v: 0, "pdf.__v": 0, "pdf._id": 0, } },
            { $lookup: {
                from: "imagens",
                localField: "uuid",
                foreignField: "lote",
                "pipeline": [ { "$sort" : { "orden" : 1 } } ],
                as: "img"
            } },
            { $project: { __v: 0, "img.__v": 0, "img._id": 0, "img.lote": 0, } },
            { $lookup: {
                from: "eventolotes",
                localField: "uuid",
                foreignField: "uuid_lote",
                as: "evlot"
            } },
            {$unwind: { path: "$evlot", preserveNullAndEmptyArrays: true }},
            { $project: { __v: 0, "evlot._v": 0, "evlot._id": 0, } },
            { $lookup: {
                from: "eventos",
                localField: "evlot.uuid_evento",
                foreignField: "uuid",
                as: "evento"
            } },
            {$unwind: { path: "$evento", preserveNullAndEmptyArrays: true }},
            { $project: {
                __v: 0,
                "evento._id": 0,                "evento.__v": 0,                "evento.categoria":0,           "evento.fecha_inicio":0,
                /*"evento.fecha_cierre":0,*/    "evento.hora_inicio":0,         /*"evento.hora_cierre":0,*/     "evento.segundos_cierre":0,
                "evento.modalidad":0,           "evento.publicar_cierre":0,     "evento.inicio_automatico":0,   "evento.mostrar_precio":0,
                "evento.mostrar_ganadores":0,   "evento.mostrar_ofertas":0,     "evento.grupo":0,               "evento.home":0,
                "evento.eventos":0,             "evento.visitas":0,             /*"evento.estado":0,*/          "evento.uuid":0,
            } },
        ]).collation({locale: 'en'})

        if(await isAdmin2(req.uid)==2){
            const flag = await eventoLote.find({uuid_lote:lote[0].uuid})
            if(flag){
                const flag2 = await evento.find({uuid: flag[0].uuid_evento})
                if(!flag2 || flag2[0].estado==0){
                    res.json({
                        ok:false,
                    });
                    return;
                }
            }else{
                res.json({
                    ok:false,
                });
                return;
            }
        }

        res.json({
            ok:true,
            lote
        });
    //}
};

const getArchivo= async(req,res = response) =>{
    const img=req.query.img;
    const tipo=req.query.tipo;
    let pathImg;
    if(tipo=='lotes') {
        const imagenesDB= await Imagen.find({img});
        if(imagenesDB.length>0){
            pathImg=pathImg= path.join( __dirname, '../files/lotes/'+imagenesDB[0].img);
        }else{
            pathImg=pathImg= path.join( __dirname, '../files/lotes/'+imagenesDB.img);
        }
    }
    if(tipo=='pdfs') {
        const PDFDB= await PDF.find({ 'pdf': { $eq: img } });
        if(PDFDB.length>0){
            pathImg=pathImg= path.join( __dirname, '../files/pdfs/'+PDFDB[0].pdf);
        }else{
            pathImg=pathImg= path.join( __dirname, '../files/pdfs/'+PDFDB.pdf);
        }
    }
    if(tipo=='evento') {
        const imagenesDB= await Imagen.find({img});        
        pathImg=pathImg= path.join( __dirname, '../files/eventos/'+imagenesDB[0].img);        
    }

    if(fs.existsSync(pathImg)){
        res.sendFile(pathImg);
    }else{
        const pathImg= path.join( __dirname, '../files/no-img.jpg');
        res.sendFile(pathImg);
    }
};

const deleteLote=async(req,res=response) =>{
    const uuid=req.body.uuid;
    try {        
        if(await isAdmin(res,req.uid)){
            const loteDB = await Lote.find({uuid})
            const imgDB = await Imagen.find({lote:uuid})
            const pdfDB = await PDF.find({pdf:loteDB[0].terminos_condiciones})
            
            if(pdfDB.length!=0){
                let pathPDF='./files/pdfs/'+pdfDB[0].pdf;
                if(fs.existsSync(pathPDF)) fs.unlinkSync(pathPDF);
                await PDF.findByIdAndDelete(pdfDB[0]._id);    
            }
            if(imgDB.length!=0){
                for (let i = 0; i < imgDB.length; i++) {
                    let pathImg='./files/lotes/'+imgDB[i].img
                    if(fs.existsSync(pathImg)) fs.unlinkSync(pathImg);
                    await Imagen.findByIdAndDelete(imgDB[i]._id);
                }
            }
            await Oferta.deleteMany({uuid_lote:loteDB[0].uuid});
            await Lote.findByIdAndDelete(loteDB[0]._id);

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

const actualizarLote= async(req,res=response)=>{    
    if(await isAdmin(res,req.uid)){        
        let flag=false;
        const loteDB= await Lote.find({uuid:req.body.lote});
        if(!loteDB){
            res.json({
                ok:false
            })
        }

        let {...camposL}=loteDB;        
        camposL=req.body;

        if(req.files && req.files['pdf']){
            let pathPDF='./files/pdfs/'+loteDB[0].terminos_condiciones;
            const pdfDB= await PDF.find({pdf:loteDB[0].terminos_condiciones});        
            
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
                camposL.terminos_condiciones= pdfFile.pdf;
                if(fs.existsSync(pathPDF)) fs.unlinkSync(pathPDF);
                await PDF.findByIdAndDelete(pdfDB[0]._id);
                await Lote.findByIdAndUpdate(loteDB[0]._id, camposL,{new:true}); 
            })    
        }else{
            flag=true;
        }

        if(req.body.imgElim){
            const imagenesElim = await Imagen.find({lote:loteDB[0].uuid}).sort({ orden: 1 }) 
            let flagElim=0;       
            for (let i = 0; i < imagenesElim.length; i++) {                
                if(flagElim>0){
                    let {...campos}=imagenesElim[i];
                    campos._doc.orden=campos._doc.orden-flagElim;    
                    await Imagen.findByIdAndUpdate(imagenesElim[i]._id, campos._doc,{new:true}); 
                }
                if(Array.isArray(req.body.imgElim)){
                    for (let j = 0; j < req.body.imgElim.length; j++) {
                        if(imagenesElim[i].img==req.body.imgElim[j]){
                            flagElim++;
                            let pathImg='./files/lotes/'+imagenesElim[i].img
                            if(fs.existsSync(pathImg)) fs.unlinkSync(pathImg);
                            await Imagen.findByIdAndDelete(imagenesElim[i]._id);
                        }
                    }
                }else{                    
                    if(imagenesElim[i].img==req.body.imgElim){
                        flagElim++;
                        let pathImg='./files/lotes/'+imagenesElim[i].img
                        if(fs.existsSync(pathImg)) fs.unlinkSync(pathImg);
                        await Imagen.findByIdAndDelete(imagenesElim[i]._id);
                    }
                }
            }

        }else if(req.files && req.files['img']) {
            borrarImagen(req.body.lote,'lotes');
            if(req.files['img'].length==undefined){
                subirImagen(req.files['img'],req.body.lote,1,res)
            }else{
                for (let i = 0; i < req.files['img'].length; i++) {
                    for (let j = 0; j < req.body.imgOrden.length; j++) {
                        if(req.body.imgOrden[j]==req.files['img'][i].name){                            
                            subirImagen(req.files['img'][i],req.body.lote,(j+1),res)
                        }
                    }
                };
            }
        }
        
        if(flag) await Lote.findByIdAndUpdate(loteDB[0]._id, camposL,{new:true});   

        res.json({
            ok:true,
        })
    }
}

const duplicarLote= async(req,res = response) =>{
    try {
        if(await isAdmin(res,req.uid)){
            const loteDB = await Lote.findById(req.body.id);
            const imgDB = await Imagen.find({lote: loteDB.uuid});
            const pdfDB = await PDF.find({pdf: loteDB.terminos_condiciones});

            let pathPDF='./files/pdfs/'+loteDB.terminos_condiciones;
            let pdf=uuidv4();
            let newFile='./files/pdfs/'+pdf+'.pdf';
            if(fs.existsSync(pathPDF)) {
                fs.copyFileSync(pathPDF, newFile)
                let {_id, ...datosPDF} = pdfDB[0]._doc;            
                const pdfNew= new PDF(datosPDF);
                pdfNew.pdf=pdf+'.pdf'
                await pdfNew.save();
            }

            let {_id, ...datos} = loteDB._doc;            
            const lote= new Lote(datos);
            lote.terminos_condiciones=pdf+'.pdf'
            lote.disponible=true;
            lote.uuid=uuidv4();
            lote.ganador='';
            lote.precio_ganador='';
            await lote.save();

            for (let i = 0; i < imgDB.length; i++) {
                let extension = imgDB[i].img.split('.');
                
                let pathImg='./files/lotes/'+imgDB[i].img;
                let imguuid=uuidv4();
                let newFileImg='./files/lotes/'+imguuid+'.'+extension[1];
                if(fs.existsSync(pathImg)) {
                    fs.copyFileSync(pathImg, newFileImg)
                    const img= new Imagen();
                    img.lote=lote.uuid;
                    img.img=imguuid+'.'+extension[1]
                    img.orden=imgDB[i].orden
                    await img.save();
                }
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

const setFavorito= async(req,res = response) =>{
    try {
        if(await isAdmin2(req.uid)==2){
            const {lote,evento} = req.body;
            const userDB = await Usuario.findById(req.uid);
            if(userDB){
                const favDB = await Favorito.find({mail:userDB.mail,uuid_evento:evento,uuid_lote:lote});
                if(favDB[0]){
                    await Favorito.deleteMany({mail:userDB.mail,uuid_evento:evento,uuid_lote:lote})
                }else{
                    const favorito= new Favorito({mail:userDB.mail,uuid_evento:evento,uuid_lote:lote});
                    await favorito.save();
                }
            }
            
            res.json({
                ok:true,
            });
        }else{
            res.json({
                ok:false,
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
}

const getFavorito= async(req,res = response) =>{
    try {
        
        if(await isAdmin2(req.uid)==2){
            const {lote,evento} = req.body;
            const userDB = await Usuario.findById(req.uid);
            
            if(userDB){
                const favDB = await Favorito.find({mail:userDB.mail,uuid_evento:evento,uuid_lote:lote});
                                
                res.json({
                    ok:true,
                    favDB
                });
            }
        }else{
            res.json({
                ok:false,
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
}

const getFavoritos= async(req,res = response) =>{
    try {
        const flag = await isAdmin2(req.uid);
        if(flag==2){
            const userDB = await Usuario.findById(req.uid)

            const favoritoDB = await Favorito.aggregate([
                { "$match": { mail: userDB.mail } },
                { $project: { __v: 0, "__v": 0 } },
                { $lookup: {
                    from: "eventos",
                    localField: "uuid_evento",
                    foreignField: "uuid",
                    as: "evento"
                } },
                {$unwind: { path: "$evento", preserveNullAndEmptyArrays: true }},
                { $project: {
                    __v: 0,
                    "evento._id": 0,                "evento.__v": 0,                "evento.categoria":0,           "evento.fecha_inicio":0,
                    /*"evento.fecha_cierre":0,*/    "evento.hora_inicio":0,         /*"evento.hora_cierre":0,*/     "evento.segundos_cierre":0,
                    "evento.modalidad":0,           "evento.publicar_cierre":0,     "evento.inicio_automatico":0,   "evento.mostrar_precio":0,
                    "evento.mostrar_ganadores":0,   "evento.mostrar_ofertas":0,     "evento.grupo":0,               "evento.home":0,
                    "evento.eventos":0,             "evento.visitas":0,             /*"evento.estado":0,*/          "evento.uuid":0,
                    "evento.estado":0,              "evento.fecha_cierre":0,        "evento.hora_cierre":0
                } },
                { $lookup: {
                    from: "lotes",
                    localField: "uuid_lote",
                    foreignField: "uuid",
                    as: "lote"
                } },
                {$unwind: { path: "$lote", preserveNullAndEmptyArrays: true }},
                { $project: {
                    __v: 0,
                    "lote.aclaracion": 0,    "lote.base_salida": 0,   "lote.uuid": 0,                  "lote.__v": 0,         "lote._id": 0,
                    "lote.descripcion": 0,   "lote.disponible": 0,    "lote.incremento": 0,            "lote.moneda": 0,
                    "lote.precio_base": 0,   "lote.precio_salida": 0, "lote.terminos_condiciones": 0 , "lote.visitas": 0
                } },
                { "$sort": { _id: -1 } },
            ]);

            res.json({
                ok:true,
                favoritoDB
            });
            return;
        }else{
            res.json({
                ok:false
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
}

module.exports={ crearLote, getLotes, lote, getArchivo, deleteLote, actualizarLote, duplicarLote, setFavorito, getFavorito, getFavoritos }