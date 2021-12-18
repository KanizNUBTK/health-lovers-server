const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient } = require('mongodb');
const cors = require('cors');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const fileUpload = require('express-fileupload');
const SSLCommerzPayment = require('sslcommerz');

// middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

//sslcommerz init
app.post('/init', (req, res) => {
    console.log(req.body);
    const data = {
        total_amount: req.body.total_amount,
        currency: 'BDT',
        tran_id: 'REF123',
        success_url: 'http://localhost/success',
        fail_url: 'http://localhost/fail',
        cancel_url: 'http://localhost/cancel',
        ipn_url: 'http://localhost/ipn',
        shipping_method: 'Courier',
        product_name: req.body.product_name,
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: req.body.cus_name,
        cus_email: req.body.cus_email,
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
        multi_card_name: 'mastercard',
        value_a: 'ref001_A',
        value_b: 'ref002_B',
        value_c: 'ref003_C',
        value_d: 'ref004_D'
    };
    console.log(data);
    const sslcommer = new SSLCommerzPayment(process.env.STORE_ID, process.env.STORE_PASS,false) //true for live default false for sandbox
    sslcommer.init(data).then(data => {
        //process the response that got from sslcommerz 
        //https://developer.sslcommerz.com/doc/v4/#returned-parameters
        // console.log(data);
        if(data.GatewayPageURL){
            res.json(data.GatewayPageURL)
        }else{
            return res.status(400).json({
                message:'Payment seassion fail'
            })
        }
    });
})
app.post('/success', async(req,res)=>{
    res.status(200).status.redirect('http://localhost:3000/success')
});
app.post('/fail', async(req,res)=>{
    res.status(200).status.redirect('http://localhost:3000')
});
app.post('/cancel', async(req,res)=>{
    res.status(200).status.redirect('http://localhost:3000')
});

//database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wvpgl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
console.log(uri);


async function run() {
    try {
        await client.connect();
        console.log('database connected');
        const database = client.db('img_pay');
        const usersCollection = database.collection('users');
        const usersProfileCollection = database.collection('profiles');
        const dietChatCollection = database.collection('dietChat');
        const gymEquipmentsCollection = database.collection('gymEquipments');
        const customerCartCollection = database.collection('customerCart');
       
        //add user
        app.post('/users', async(req,res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            //console.log(result);
            res.json(result);
        });
        //make admin
        app.put('/users/admin', async(req,res)=>{
            const user = req.body;
            //console.log('put', user);
            const filter = {email: user.email};
            const updateDoc = {$set: {role: 'admin'}};
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });
        //secure admin
       app.get('/users/:email', async(req,res)=>{
        const email=req.params.email;
        const query = {email: email};
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if(user.role === 'admin'){
          isAdmin = true;
        }
        res.json({admin: isAdmin});
      });
      //user profile information
      app.post('/profile', async(req,res)=>{
        //   console.log('body', req.body);
        //   console.log('files', req.files);
          const userName = req.body.name;
          const userEmail = req.body.email;
          const userPhoneNumber = req.body.phoneNumber;
          const userAddress = req.body.address;
          const userProfliePic = req.files.profilePictute;
          const profilePicData = userProfliePic.data;
          const encodedProfilePic = profilePicData.toString('base64');
          const profilePicBuffer = Buffer.from(encodedProfilePic, 'base64');
          const photo={
            userName,
            userEmail,
            userPhoneNumber,
            userAddress,
            profilePictute: profilePicBuffer
          }
          const result = await usersProfileCollection.insertOne(photo);
          // console.log(result);
          res.json(result);
      });
      //pdf insert
      app.post('/services', async(req,res)=>{
        //   console.log('body', req.body);
        //   console.log('files', req.files);
        const chatname=req.body.dietChatName;
        const pdf = req.files.deitPdf;
        const pdfData = pdf.data;
        const encodedPdf = pdfData.toString('base64');
        const pdfBuffer = Buffer.from(encodedPdf, 'base64');
        const chatPdf ={
            chatname,
            deitPdf:pdfBuffer
        }
        const result = await dietChatCollection.insertOne(chatPdf);
        //console.log(result);
        res.send(result);
      });
      //get deit pdf
      app.get('/services', async(req,res)=>{
        const cursor = dietChatCollection.find({});
        const result = await cursor.toArray();
        res.json(result);
      });
    //Upload Gym Equipment
    app.post('/gym', async(req,res)=>{
        // console.log('body', req.body);
        // console.log('files', req.files);
        const gymEqpName = req.body.gymEqpName;
        const price = req.body.price;
        const description = req.body.description;
        const gymPhoto = req.files.photoOfEqp;
        const gymPhotoData = gymPhoto.data;
        const encodedGymPhoto = gymPhotoData.toString('base64');
        const gymPhotoBuffer = Buffer.from(encodedGymPhoto, 'base64');
        const gymEQPhoto={
            gymEqpName,
            price,
            description,
            photoOfEqp:gymPhotoBuffer
        }
        const result = await gymEquipmentsCollection.insertOne(gymEQPhoto);
        //console.log(result);
        //res.json({success: true});
        res.json(result);
    });
    //get profile picture
    app.get('/profile', async(req,res)=>{
        const email = req.query.email;
        const query = {email:email};
        const cursor = usersProfileCollection.find(query);
        const profile = await cursor.toArray();
        //console.log(profile);
        res.json(profile);
    });
    //get gym equipment collection
    app.get('/gym', async(req,res)=>{
        const cursor = gymEquipmentsCollection.find({});
        const result = await cursor.toArray();
        res.json(result);
    });
    //submit cart from
    app.post('/cart', async(req,res)=>{
        const user = req.body;
        const result = await customerCartCollection.insertOne(user);
        //console.log(result);
        res.json(result);
    });
    //get cart data for table
    app.get('/cart', async(req,res)=>{
        const cursor = customerCartCollection.find({});
        const result = await cursor.toArray();
        //console.log(result);
        res.json(result);
    });

    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('hello heath lovers');
});

app.listen(port, () => {
    console.log('Running Server on port', port);
})