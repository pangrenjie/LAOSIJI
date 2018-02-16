const superAgent = require('superagent');
const cheerio=require('cheerio');
const fs=require('fs');
const request = require('request');
const mysql=require('mysql');
//var n=1;var m=0;  

var n=16 ;var m=10;    //子页的页码从0开始
var num=0;
var ccc=1;
 
var db=mysql.createPool({
    host:'localhost',
    user:'root',
    password:'123456', 
    database:'2018'
})
function fetchPage(n,m) {     //封装了一层函数 
    if(n==1){
        var url='https://555av.vip/list/'+ccc+'.html';
        father(url,m,n); 
    }else{
        var url='https://www.555av.vip/list/'+ccc+'-'+n+'.html';
        //http://m.444lu.co/vlist.php?classid=2
        father(url,m,n); 
    }
}
const base_headers={
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding':'gzip, deflate, sdch',
    'Accept-Language':'zh-CN,zh;q=0.8,en;q=0.6',
    //'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
   'User-Agent':'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Mobile Safari/537.36'
};  
function father(url,m,n){
    var href=[];
    superAgent.get(url).set(base_headers).end(function(err,res){
        var $=cheerio.load(res.text,{decodeEntities:false});
        var aaa=$('ul.mlist li div.info h2 a')
        aaa.each(function(i,elem){
            href.push($(this).attr('href'));
        })
        //将n,m ，href传入changeLink();
        changeLink(n,m,href);
    })
} 
function changeLink(n,m,href){
    if(m <= href.length-1){
        //把所有的子连接传给子函数爬取信息
        let newLink='https://555av.vip'+href[m];
        child(newLink,n,m,href);
    }else if(m>href.length-1){
        m=0;
        n=n+1;
        fetchPage(n,m);  
    }  
}
function child(url,n,m,href){
    var time=new Date().getTime();
    var imgHref=[]
    superAgent
    .get(url)
    .set(base_headers)
    .end(function(err,res){
        var $=cheerio.load(res.text,{decodeEntities: false});
        var title=$('div#main div.view div.pic img').attr('alt')
        var update=$("div.info li div.fl").html().replace(/<span.+span>/g,'');
        var title_img_src='https:'+$('div#main div.view div.pic img').attr('src')
        var title_img_name=title_img_src.split('/');
            title_img_name=title_img_name[title_img_name.length-1];
        var downloadLink=$('div.endpage div.mox div.played2k textarea').html()//链接
        var imgs_src=$('div.vodimg img');    //所有图片

        imgs_src.each(function(i,elem){
            if($(this).attr('src').indexOf('?')!=-1){
                imgHref.push($(this).attr('src').split('?')[0]);
            }else{
                imgHref.push($(this).attr('src'));
            }
        })
        var titleName=[title];
        db.query(`select name from pc_new where name=?`,titleName,function(err,data){
            if(err){
                console.log('名字查询有错',err);
            }else if(data.length>0){
                console.log('这条记录已经存在！');
                m=m+1;
                changeLink(n,m,href);
            }else{
                if(imgs_src.length<1 || downloadLink==''){
                    console.log('没有图片或者没有链接')
                    m=m+1;
                    changeLink(n,m,href); 
                }else{
                    console.log('一共有'+imgs_src.length+'张图片'+'--'+'当前子页是：'+m+'--当前父页是：'+n)
                    var p2=new Promise(function(res,rej){
                        var wws=fs.createWriteStream('./NODE/www/title/'+n+'-'+m+'_'+title_img_name);
                        request(title_img_src).pipe(wws);
                        wws.on('finish',function(){
                            var titleImgSrc=n+'-'+m+'_'+title_img_name;
                            res(titleImgSrc);  
                        })
                    }).then(function(value){
                        if(value){


                            for(var i=0;i<imgs_src.length;i++){
                                var img_title=imgHref[i].split('/');
                                img_title=img_title[img_title.length-1];
                                if(imgHref[i].indexOf('http')!=-1){
                                        var img_src=imgHref[i];
                                }else{
                                        var img_src='https:'+imgHref[i];
                                }
                            saveimg(img_title,img_src,n,imgs_src.length,href,time,m, imgHref,value,title,downloadLink,update);
                            } 
                        

                        }                       
                    })
                }
            }
        })
    })
}
var timer=null;
function saveimg(title,src,n,imglenght,href,time,m,imgHref,imgTitleSrc,title_name,downloadLink,update1){
    
    clearTimeout(timer);
    var imgTitle=n+'_'+m+'_'+title;
    var ws=fs.createWriteStream('./NODE/www/pic/'+imgTitle); //在外面定义ws这个变量
    const p= Promise.race([         //定一个promise.race 进行竞赛如果读取一个图片的时间超过10s 就让程序重启
        new Promise(function(res,rej){
            request(src,function(err,body){
                if(err){
                    num+=1;
                    res(num);
                }else{
                    request(src).pipe(ws);
                    ws.on('finish',function(){
                        num+=1;
                        res(num);
                    })
                } 
            })
        })
    ]);
    p.then(function(value){
        if(value >= imglenght){
            var time2=new Date().getTime();
            var allTime=(time2-time)/1000;


            var arr=imgHref.map(function(item){
                item=item.split('/');
                item=item[item.length-1]
                return n+'_'+m+'_'+item;
            });

            
            var arr2=arr.toString();
            var query=[title_name,imgTitleSrc,arr2,downloadLink,update1];
            db.query(`INSERT INTO pc_new (name,title_img,cont_imgs,download,update_a) VALUES(?,?,?,?,?)`,query,function(err){
                if(err){
                    console.log('数据库错误:'+err);
                }else{
                    console.log(value+"--------写入完成");
                    console.log('这个子页全部读写成功！-----耗时'+allTime+'秒');
                    console.log('   ');
                    num=0;
                    m=m+1;
                    changeLink(n,m,href); 
                }
            });
        }else{
            console.log(value+"--------写入完成");
        }
    });
}
fetchPage(n,m);

//所有问题：

//1.图片的格式问题，有的格式并不是5个部分
//2.有的页面图片并没有
//3.等待时间问题---没有完全解决
//4.图片的地址无法读取
//5.因为我在child函数的最后使用了一个for循环，所以会有一堆的图片链接进来，所以使用promise不能很好的控制速度，以及不能使链接失败后能够从新启动
//6.有的图片带有“http”所以不用给他加上http：

//版本详情：
//1.加入一个promise对象让读文件与设置一个时间进行竞赛，如果写入文件超时就让程序重启
//2.修复当重启程序时ws没有关闭
//3.加一个更新时间字段 update_a
//4.能够识别图片地址是否带有http，没有的话就给加上。
//5.加入更新的功能