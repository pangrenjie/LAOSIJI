const express=require('express');
const common=require('../libs/common')
const mysql=require('mysql');
const db=mysql.createPool({
    host:'localhost',
    user:'root',
    password:'123456',
    database:'blog',
    port:'3306'
})
module.exports=function(){
    var router=express.Router();
    //单反是请求admin的都会要求登录
    router.use((req,res,next)=>{
       
        
            db.query('SELECT * FROM user_table',(err,data)=>{
                if(err){
                    res.status(500).send('数据库错误').end();
                }else{
                    req.userdata=data;
                    next();
                }
            })  
       
    });

    router.get('/',function(req,res){
        res.render('admin/userdata.ejs',{
            data:req.userdata,
        });    
    });

//退出登录
    router.post('/',function(req,res){
        if(req.body.act=='back'){
           delete req.session['admin_id'];
           res.send({ok:true,msg:'退出成功'});
        }else{
            res.send({ok:false,msg:'未知错误！'});
        }
    })



    router.get('/login',function(req,res){
        
        if(req.session['admin_id']){
            res.redirect('/admin')
        }else{
            res.render('admin/login.ejs',{}); 
        };
        
    })
    
    router.post('/login',function(req,res){
        var username=req.body.username;
        var password=common.md5(req.body.password+common.md5_secret);
       // password=common.md5(password+common.md5_secret);
       console.log(password);
        db.query(`SELECT * FROM admin WHERE username="${username}"`,function(err,data){
            if(err){
                res.status(500).send('database error!').end();
            }else{
                if(data[0]==null){
                    res.send('对不起，没有这个用户')
                }else{
                    if(data[0].password==password){
                        req.session['admin_id']=data[0].id;
                        res.redirect('/admin');
                    }else{
                        res.send('密码错误')
                    }
                }
            }
        })
    });
    return router;
}