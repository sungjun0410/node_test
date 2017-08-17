var fs = require('fs');
var server = require('http').createServer();
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var dt = require('date-utils');

var user = '';
var pwd = '';
var ress;



server.listen(8000, function(){
     console.log('Server Running at http://localhost:8000');

     var mysql = require("mysql");
     var connection = mysql.createConnection({

          host : "localhost",
          port : 3306,
          user : "root",
          password : "1111",
          database : "user"

     });

     var sqlQuery = "update user set online=0";
     var sqlQuery2 = "update wait set matched =1";

     connection.connect();
     connection.query(sqlQuery);
     connection.query(sqlQuery2);
     connection.end();

});


server.on('request', function(req, res){
     console.log('request Call');

     fs.readFile( 'chatting.html', function(error, data){
          res.writeHead( 200, { 'Content-Type' : 'text/html' } );
          res.end( data );
     });
});

var io = require('socket.io').listen(server);

io.sockets.on( 'connection', function(socket){

     // io.sockets.in( socket.id ).emit('user', user);
     // io.sockets.in( socket.id ).emit('pwd', pwd);

     socket.on( 'join', function(data){
          //console.log(data);
          socket.join(data);
          socket.room = data;
     });

     socket.on( 'message', function(data){

          //console.log( 'id : %s, msg : %s, date : %s', data.id, data.message, data.date );
          io.sockets.in( socket.room ).emit('message', data);
     });

     socket.on( 'solo', function(data){

          //console.log( 'solo id : %s, msg : %s, date : %s', data.id, data.message, data.date );
          io.sockets.in( socket.id ).emit('solo', data);
     });

     socket.on( 'login', function(data){

          //console.log( '로그인시도 id : %s, pwd : %s', data.id, data.pw);

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });

          var sqlQuery = "SELECT * FROM user where userid=? and pw=?";
          // var sqlQuery2 ="";
          var sqlQuery2 = "update user set online=1 where userid=?";
          function callback(err,rows, fields){

               if(err){

                    throw err;

               }
               //console.log(rows[0]+'검사');
               if(rows.length==0) {
                    //console.log('비어있음');
                    sqlQuery2="";
                    io.sockets.in( socket.id ).emit('loginFail');
               }else{
                    io.sockets.in( socket.id ).emit('login', rows[0]);
               }
          }
          function callback2(err,rows, fields){

               if(err){

                    throw err;
               }

               //console.log('온라인으로 설정');

          }

          connection.connect();
          connection.query(sqlQuery,[data.id,data.pw], callback);
          connection.query(sqlQuery2,[data.id], callback2);
          connection.end();

     });

     socket.on( 'logout', function(data){

          //console.log( '로그아웃 시도 id : %s', data.id);

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });

          var sqlQuery = "update user set online=0 where userid=?";

          function callback(err,rows, fields){

               if(err){

                    throw err;

               }
               console.log('온라인');
          }

          connection.connect();
          connection.query(sqlQuery,[data.id], callback);
          connection.end();

     });

     socket.on( 'stat', function(data){

          //console.log( '통계 갱신');
          var out;
          var out2;
          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });

          var sqlQuery = "select count(*) as a from wait where matched=0";
          var sqlQuery2 = "select count(*) as a from user where host=1 and online=1";
          var sqlQuery3 = "select consultant, count(*) a from (SELECT * FROM list WHERE date > DATE_ADD(now(), INTERVAL -10 HOUR)) b group by consultant order by a desc";
          // var sqlQuery3 = "select * from wait where host=0";
          // var sqlQuery4 = "select * from user where host=1 and online=1";

          function callback(err,rows, fields){

               if(err){

                    throw err;

               }
          //     console.log(rows[0].a);
               out = rows[0].a;
          }
          function callback2(err,rows, fields){

               if(err){

                    throw err;

               }
          //     console.log(rows[0].a);
               out2 = rows[0].a;
               io.sockets.emit('stat', {
                    wait : out,
                    consultant : out2
               });
          }
          function callback3(err,rows, fields){

               if(err){
                    throw err;
               }

               for(var i=0; i<rows.length;i++){
                    if(i==0){
                         io.sockets.in( socket.id ).emit('countStart',rows[0]);
                    }
                    io.sockets.in( socket.id ).emit('count', rows[i]);
               }
          }

          connection.connect();
          connection.query(sqlQuery, callback);
          connection.query(sqlQuery2, callback2);

          connection.query(sqlQuery3, callback3);
          connection.end();

     });

     socket.on( 'list', function(data){
          //console.log( data );

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });

          var sqlQuery = "SELECT * FROM list where userid=?";

          function callback(err,rows, fields){

               if(err){

                    throw err;

               }
               if(rows.length==0){
                    io.sockets.in(socket.room).emit('listFail');
               }else{
                    for(var i=0; i<rows.length;i++){

                         //console.log(rows[i]);
                         io.sockets.in( socket.room ).emit('list', rows[i]);

                    }
               }
          }

          connection.connect();
          connection.query(sqlQuery,[data], callback);
          connection.end();
          //test



     });
     socket.on( 'makeRoom', function(data){

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });
          var name;
          var sqlQuery = "insert into wait (userid,date) values(?,?)";
          var sqlQuery2 = "select * from wait where userid =? and matched =0";
          var sqlQuery3 = "select consultant, a from (select consultant, count(*) a from (SELECT * FROM list WHERE date > DATE_ADD(now(), INTERVAL -11 HOUR)) b group by consultant order by a asc) c left join user d on c.consultant = d.userid where d.online=1 order by a asc";

          function callback(err,rows, fields){

               if(err){
                    throw err;
               }
          }
          function callback2(err,rows, fields){

               if(err){
                    throw err;
               }
               io.sockets.in( socket.id ).emit('onMakeRoom', rows[0]);
          }
          function callback3(err,rows, fields){

               if(err){
                    throw err;
               }
               if(rows.length !=0){
                    console.log("onmakeroom2 : "+rows[0]);
                    io.sockets.in( socket.id ).emit('onMakeRoom2', rows[0]);
               }else{

               }
          }

          connection.connect();
          connection.query(sqlQuery,[data.userid,data.date], callback);
          connection.query(sqlQuery2,[data.userid], callback2);
          connection.query(sqlQuery3, callback3);
          connection.end();

     });

     socket.on( 'putConsultant', function(data){

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });

          var sqlQuery = "update wait a set consultant=? where a.index=? ";
          function callback(err,rows, fields){
               if(err){
                    throw err;
               }

          }

          connection.connect();
          connection.query(sqlQuery,[data.consultant, data.room], callback);
          connection.end();

     });

     socket.on( 'findCustomer', function(data){

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });

          var sqlQuery = "SELECT * FROM wait where matched=0 and consultant=? limit 1";
          function callback(err,rows, fields){
               if(err){
                    throw err;
               }
               if(rows.length ==0){
                    io.sockets.in( socket.id ).emit('findCustomerFail');
               }else{
                    io.sockets.in( socket.id ).emit('getCustomer', rows[0]);
               }
          }

          connection.connect();
          connection.query(sqlQuery,[data.userid], callback);
          connection.end();

     });

     socket.on( 'deleteRoom', function(data){

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });
          //console.log('검사 '+data.room);
          var sqlQuery = "update wait w set matched='1' where w.index=?";

          function callback(err,rows, fields){

               if(err){
                    throw err;
               }

               for(var i=0; i<rows.length;i++){
                    //console.log(rows[i].text);
               }
          }

          connection.connect();
          connection.query(sqlQuery,[data.room], callback);
          connection.end();

     });

     socket.on( 'comeIn', function(data){

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });

          var sqlQuery = "SELECT * FROM wait where host=0 limit 1";

          function callback(err,rows, fields){

               if(err){
                    throw err;
               }
               if(rows.length==0){

               }else{
                    socket.emit('findCustomer', rows[0]);
               }
          }

          connection.connect();
          connection.query(sqlQuery, callback);
          connection.end();

     });
     socket.on( 'toCustomer', function(data){
          //console.log(data.customer + data.consultant,data.room);
          socket.emit('toCustomer', data);

     });

     socket.on( 'listIn', function(data){

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });
          //console.log(data);

          var sqlQuery = "insert into list (userid,text,consultant,date) values(?, ?, ?, ?)";
          var sqlQuery2 = "insert into requestlist (userid,category,request,date) values(?, ?, ?, ?)";


          function callback(err,rows, fields){

               if(err){
                    throw err;
               }

          }
          function callback2(err,rows, fields){

               if(err){
                    throw err;
               }

          }

          connection.connect();
          connection.query(sqlQuery2,[data.userid, data.category, data.request, data.date2], callback);
          connection.query(sqlQuery,[data.userid, data.text, data.consultant, data.date], callback);

          connection.end();

     });

     socket.on( 'start', function(data){

          io.sockets.in( socket.room ).emit('onMessage', data);

     });

     socket.on( 'getInfo', function(data){

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });

          var sqlQuery = "select * from userinfo where userid=? limit 1";
          var sqlQuery2 = "select * from hostinfo where userid=? limit 1";
          function callback(err,rows, fields){

               if(err){
                    throw err;
               }
               io.sockets.in( socket.room ).emit('getInfo', rows[0]);
          }
          function callback2(err,rows, fields){

               if(err){
                    throw err;
               }
               io.sockets.in( socket.room ).emit('getInfo2', rows[0]);
          }
          connection.connect();
          connection.query(sqlQuery,[data.customer], callback);
          connection.query(sqlQuery2,[data.consultant], callback2);
          connection.end();
     });

     socket.on( 'getRequest', function(data){

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });

          var sqlQuery = "select * from requestlist w where userid=? order by w.index desc";
          //var sqlQuery = "select * from wait where userid=?";

          function callback(err,rows, fields){

               if(err){
                    throw err;
               }
               if(rows.length ==0){
                    //io.sockets.in( socket.id ).emit('getRequestFail',rows[0]);
               }else{
                    io.sockets.in( socket.room ).emit('getRequestOn',rows[0]);
                    for(var i=0; i<rows.length;i++){
                         //console.log(rows[i]);
                         if(i==0){
                              io.sockets.in( socket.room ).emit('getRequestStart', rows[i]);
                         }else{
                              io.sockets.in( socket.room ).emit('getRequest', rows[i]);
                         }
                    }
               }
          }

          connection.connect();
          connection.query(sqlQuery,[data], callback);

          connection.end();
     });

     socket.on( 'start', function(data){

          io.sockets.in( socket.room ).emit('onMessage', data);

     });
     socket.on( 'toconsultant', function(data){
          console.log(data);
          io.sockets.emit('toConsultant', data);

     });

     socket.on( 'getQue', function(data){
          console.log('getque 진입');
          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });
          var sqlQuery = "select * from wait where matched=0 and consultant=?";

          function callback(err,rows, fields){

               if(err){
                    console.log('에러발생');
                    throw err;

               }
               console.log(rows[0]);
               io.sockets.in( socket.id ).emit('getQue', rows[0]);

          }

          connection.connect();
          connection.query(sqlQuery, [data.consultant] , callback);
          connection.end();

     });
     socket.on( 'getQue2', function(data){

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });
          var sqlQuery = "select * from requestlist w where userid=? order by w.index desc limit 1";

          function callback(err,rows, fields){

               if(err){

                    throw err;

               }
               console.log(rows[0]);
               io.sockets.in( socket.id ).emit('getQue2', rows[0]);

          }

          connection.connect();
          connection.query(sqlQuery, [data.userid] , callback);
          connection.end();

     });

     socket.on( 'onlineCheck', function(data){

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });

          var sqlQuery = "select * from user where host=1 and online=1 ";
          function callback(err,rows, fields){
               if(err){
                    throw err;
               }
               if(rows.length !=0){
                    io.sockets.in( socket.id ).emit('onlineCheck');
               }else{
                    io.sockets.in( socket.id ).emit('onlineCheckFail');
               }
          }

          connection.connect();
          connection.query(sqlQuery, callback);
          connection.end();

     });

     socket.on( 'listStart', function(data){

          var mysql = require("mysql");
          var connection = mysql.createConnection({

               host : "localhost",
               port : 3306,
               user : "root",
               password : "1111",
               database : "user"

          });

          var sqlQuery = "insert into list (consultant,date) values(?,?)";

          function callback(err,rows, fields){

               if(err){

                    throw err;

               }
               console.log('리스트 시작');
          }

          connection.connect();
          connection.query(sqlQuery,[data.consultant,data.date], callback);
          connection.end();

     });


});
