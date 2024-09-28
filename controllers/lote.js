const { response }=require('express');
const Lote = require('../models/lote');
const PDF = require('../models/pdf');
const fs=require('fs');
const { v4: uuidv4 }=require('uuid');
const { isAdmin } = require('./admin');
const Imagen = require('../models/imagen');
const path=require('path');

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
                await lote.save();  

                for (let i = 0; i < req.files['img'].length; i++) {
                    const img=req.files['img'][i]
                    const nombreCortado=img.name.split('.');
                    const extensionArchivo=nombreCortado[nombreCortado.length-1];
                    const nombreArchivo= uuidv4()+'.'+extensionArchivo;
                    const path= './files/lotes/'+nombreArchivo;
                    const datos={ lote: lote.uuid, img: nombreArchivo };
        
                    img.mv(path, async (err)=>{
                        if(err){
                            console.log(err);
                            return res.status(500).json({
                                ok:false,
                                msg:'error en carga de imagen '+nombreCortado[0],
                            })
                        }
                        const imagen = new Imagen(datos);
                        await imagen.save();
                    })
                };
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
        var sortOperator = { "$sort": { } };
        sortOperator["$sort"][order] = orden;

        const [ lotes, total ]= await Promise.all([
            Lote.aggregate([
                { $project: {
                    __v: 0,
                    "descripcion": 0,
                    "aclaracion": 0,
                    "terminos_condiciones": 0,
                } },
                sortOperator,
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
    if(await isAdmin(res,req.uid)){
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
                as: "img"
            } },
            { $project: { __v: 0, "img.__v": 0, "img._id": 0, "img.lote": 0, } },
        ]).collation({locale: 'en'})

        res.json({
            ok:true,
            lote
        });
    }
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

    if(fs.existsSync(pathImg)){
        res.sendFile(pathImg);
    }else{
        const pathImg= path.join( __dirname, '../files/no-img.jpg');
        res.sendFile(pathImg);
    }
};

module.exports={ crearLote, getLotes, lote, getArchivo }