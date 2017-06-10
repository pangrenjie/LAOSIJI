const express=require('express');
const bodyParser=require('body-parser');
const cookieParser=require('cookie-parser');
const cookieSession=require("cookie-session");
const static=require('express-static');
//const ejs=require('ejs');
//const jade=require("jade");
const consolidate=require('consolidate');
const fs=require('fs');
const pathLib=require('path');
const multer=require('multer');
const mysql=require('mysql');
const common=require('./libs/common');

//连接数据库
const db=mysql.createPool({
  host:'localhost',
  user:'root',
  password:'123456',
  port:'3306',
  database:'2018'
});
var server=express();
server.listen(1111);

//1.cookie、session
server.use(cookieParser());
(function(){
    var arr=[];
    for(var i=0;i<100000;i++){
        arr.push('sdf_'+Math.random());
    }
    server.use(cookieSession({
        keys:['aaa','bbb','ccc'],
        maxAge:120*60*1000,
        name:'id_sess'
    }));
})()


//3.post数据
server.use(bodyParser.urlencoded({extended:false}));

//4.用户文件上传
server.use(multer({dest:'./www/upfiles'}).any());
/*
server.use('/aaa',function(req,res){
  var newname=req.files[0].path+pathLib.parse(req.files[0].originalname).ext;
  fs.rename(req.files[0].path,newname,function(err){
    console.log(err);
  });
})
*/
server.set('view engine','html');
server.set('views','./views');
server.engine('html',consolidate.ejs);

//路由

server.use('/',function(req,res,next){
var page='';
  if(!req.session['admin_id'] && req.url!='/login'){
      res.redirect('/login');
  }else{
      if(req.query.page==undefined){
            page=0;
      }else{
          console.log(req.query)
            page=req.query.page;
      }
      
     db.query(`SELECT * FROM pc_new LIMIT ${page*10},10`,(err,data)=>{
        if(err){
            res.status(500).send('数据库错误').end();
        }else{
            req.userdata=data;
           
            next();
            
        }
    })
  }
});

server.get('/',function(req,res){
    console.log(req.session['admin_id']+",欢迎光临")
    res.render('admin/userdata.ejs',{
        data:req.userdata,
    });    
});

//退出登录
server.post('/',function(req,res){
    if(req.body.act=='back'){
        delete req.session['admin_id'];
        res.send({ok:true,msg:'退出成功'});
    }else{
        res.send({ok:false,msg:'未知错误！'});
    }
})



server.get('/login',(req,res)=>{
  if(req.session['admin_id'] ){
      res.redirect('/')
  }else{
      res.render('admin/login.ejs')
  }

})
server.post('/login',(req,res)=>{
    
    var username=req.body.username;
    var password=common.md5(req.body.password+common.md5_secret);
       // password=common.md5(password+common.md5_secret);
       console.log(password)
    console.log(req.body);
      db.query(`SELECT * FROM admin WHERE username="${username}"`,function(err,data){
          if(err){
              res.status(500).send('database error!').end();
          }else{
              if(data[0]==null){
                  res.send('对不起，没有这个用户')
              }else{
                  if(data[0].password==password){
                      req.session['admin_id']=data[0].username;
                      res.redirect('/');
                  }else{
                      res.send('密码错误')
                  }
              }
          }
      })
})
 
server.use('/chakan',(req,res)=>{
    if(!req.session['admin_id']){
        res.redirect('/login');
    }else{
        if(parseInt(req.query.id)<1){
            res.redirect('/chakan?id=1');
        }else{
            var id=[req.query.id];
            db.query('SELECT * FROM pc_new WHERE id=?',id,(err,data)=>{
                if(err){
                    res.status(500).send('数据库错误').end();
                }else{
                    if(!data[0].cont_imgs){
                        res.send('暂无数据。。。')
                    }else{
                        var imgs=data[0].cont_imgs.split(',');
                        res.render('admin/lianjie.ejs',{data:data,imgs:imgs});
                    }
                    
                }
            }) 
        }
    } 
})
//用户搜索
server.use('/sousuo',function(req,res){
    if(!req.session['admin_id']){
        res.redirect('/login');
    }else{
        if(req.query.data){
            var sousuo_data=[req.query.data];
            console.log(req.query.data)
            db.query(`SELECT id,name,title_img FROM pc_new WHERE name LIKE '%${req.query.data}%'`,function(err,data){
                if(err){
                    res.status(500).send('数据库有错误'+err).end();
                }else{
                
                    res.render('admin/sousuo.ejs',{
                        data:data
                    })
                }
            })
        }else{
            res.redirect('/');
        }
    }
    
})

//访问静态数据
server.use(static('./www'));