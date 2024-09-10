const jwt =require('jsonwebtoken');

const generarJWT=(uid,tipo)=>{
    return new Promise((resolve,reject)=>{
        const payload={ uid };

        let secret, expired;
        switch (tipo) {
            case 1:
                secret=process.env.JWT_SECRET;
                expired='72h';
                break;
            case 2:
                secret=process.env.JWT_VALIDATE;
                expired='2h';
                break;
            case 3:
                secret='';
                break;
            default:
                break;
        }

        jwt.sign(payload, secret,{
            expiresIn: expired
        }, (err,token)=>{
            if(err){
                console.log(err);
                reject(err)
            }else{
                resolve(token);
            }
        });
    })
}

module.exports={generarJWT};