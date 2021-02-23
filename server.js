const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');
const multer = require('multer');
const csv = require('fast-csv');
const dotenv = require('dotenv');
const mysql = require('mysql');

const AppError = require('./error_file/appError');

dotenv.config({path:'./config.env'});


var port = process.env.PORT;

app.use('/uploads', express.static(path.join(__dirname, '/uploads')));


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        //console.log(file);
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype == 'text/csv' || file.mimetype == 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
}
const upload = multer({ storage: storage, fileFilter: fileFilter });

/*Upload the file POST method
    1.) upload single file -> use upload.single
*/
app.post('/api/uploadFile', upload.single('file'), (req, res, next) => {
    try {
        //console.log(__dirname + '/uploads/' + req.file.filename);
        sendDatatoMysql(__dirname + '/uploads/' + req.file.filename);

       res.status(200).json({
            status:'success',
            file: req.file,
            message: 'File uploaded successfully'
       });

    } catch (error) {
        return next(new AppError('Uploading failed : '+ err.message  , 400));
    }
});

//call the send data to mysql function
sendDatatoMysql = (fileName) =>{
       // console.log(fileName);
       let stream = fs.createReadStream(fileName);
       let CSV_data = [];
       let csvStream = csv.parse()
                        .on("data", (data) =>{
                            CSV_data.push(data);
                        })
                        .on("end", () =>{
                            CSV_data.shift();

                            const connect_db = mysql.createConnection({
                                host: process.env.MYSQL_HOST,
                                user: process.env.MYSQL_USER,
                                password: process.env.MYSQL_PASSWORD,
                                database: process.env.MYSQL_DATABASE_NAME
                            });

                        let createInventory_det = "create table if not exists inventory_det(id int(10) primary key auto_increment not null,sku varchar(20) unique not null,product_name varchar(20) not null,quantity int(10) not null default 0,price float(5,2) not null,cond enum('New', 'Used') not null,isbn bigint(15) not null)  auto_increment = 1";
                        connect_db.query(createInventory_det, (err, res, fields, next) =>{
                            if(err)  //console.log(err.message); // else use throw err;
                                return next(new AppError(err.message, 400));
                            console.log(res);
                            
                        });  
                        
                        let query = 'INSERT INTO inventory_det (sku,product_name,quantity,price,cond,isbn) VALUES ?';
                        connect_db.query(query, [CSV_data], (err, res, next) => {
                            if(err)
                                return next(new AppError(err.message, 400));
                            
                            res.status('200').json({
                                status:'success',
                                message: "Inserted successfully"
                            });
                        });

                    });
    stream.pipe(csvStream);
};

app.listen(port, () =>
     console.log(`Application listening on port ${port}!`)
);
