const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { sign } = require('jsonwebtoken');
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@clustersorav.tqapkj6.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJwt = (req, res, next)=>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: "Unauthorized access"})
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.SECRET, (error, decoded)=>{
    if(error){
      return res.status(401).send({error: true, message: "Unauthorized access"})
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const toysCollection = client.db('toyStore').collection('toys');

    // indexing toy name 
    const indexKeys = {toyName: 1};
    const indexOptions = {name: "toyNameIndex"}

    const result = await toysCollection.createIndex(indexKeys, indexOptions)


    app.post("/jwt", (req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET, {expiresIn: '2h'});
      res.send({token});
    })

    app.get("/toys", async (req, res)=>{
        const result = await toysCollection.find().toArray();
        res.send(result);
    })

    app.post("/toys", async(req,res)=>{
      const toyDetails = req.body;
      console.log(toyDetails);
      const result = await toysCollection.insertOne(toyDetails);
      res.send(result)
    })

    app.get("/toyslimit/:limit", async(req, res)=>{
      const limit = parseInt(req.params.limit);
      const result = await toysCollection.find().limit(limit).toArray();
      res.send(result);
    })

    // search by toy name 

    app.get("/toysSearch/:text", async (req, res)=>{
      const searchText = req.params.text;
      const result = await toysCollection.find({toyName: { $regex: searchText, $options: "i"}}).toArray();
      res.send(result);
    })


    app.get("/toys/:category", async (req,res)=>{
      const category = req.params.category;
      const query = { subCategory : category}
      const result = await toysCollection.find(query).limit(9).toArray();
      res.send(result)
    })

    app.get("/toyModal/:id", async (req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await toysCollection.find(query).toArray();
      res.send(result);
    })

    app.get("/mytoys", verifyJwt, async(req, res)=>{
      const email = req.body;
      const decoded = req.decoded;
      if(decoded.email !== req.query.email){
        return res.status(401).send({error: 1, message: "Unauthorized access"})
      }
      let query = {}
      if(req.query?.email){
        query = {sellerEmail: req.query.email}
      }
   
      const result = await toysCollection.find(query).toArray();
      console.log(result);
      res.send(result);

    })


    app.put("/mytoys/:id", async (req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const updateData = req.body;
  
      const updateDoc = {
        $set: {...updateData}
      }
      const result = await toysCollection.updateOne(query, updateDoc);
      res.send(result);
      
    })

    app.delete("/mytoys/:id", async (req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const result = await toysCollection.deleteOne(filter);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res)=>{
    res.send("toy server online");
})

app.listen(port, ()=>{
    console.log("server online")
})