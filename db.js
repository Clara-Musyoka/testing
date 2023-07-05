//connect to your mongoose using url
const mongoose = require('mongoose');
//use string concatination on the db url to hide sensitive information
let db_url = "mongodb+srv://musyokam:practice123@cluster0.7czjfcw.mongodb.net/trial"
let options = {
    maxPoolSize: 100,
    family: 4, //connect with IPV4 without trying IPV6
    autoIndex: false
}; //empty object that can be used to dicitate how the connection can happen. eg, you can connect 10 
//conncurrent connections

let setup = ()=>{
    mongoose.connect(db_url, options);
    let db = mongoose.connection;
    db.once("open", ()=>{
        console.log("Successful connection to the database");
    });
    db.on("error", (error)=>{
        console.log("Connection to db failed");
        console.log(error);
    });
    //c
    return db;
}
module.exports = setup;