const crypto=require("crypto")
module.exports={
    md5:function(str){
        var obj=crypto.createHash('md5');
        obj.update(str);
        return obj.digest('hex'); 
    },
    md5_secret:'sdfdfasdf&^%&hI()b9uy9*Tg8tbbdutf^%%^87*BI765^%$*&(^UT97'
}
