const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('HMend Server Is Running...')
});





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xrg54hx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// verifyToken
const verifyToken = async (req, res, next) => {
  const token = req.cookie;
  if (!token) {
    res.status(401).send({ message: 'Forbidden Access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // Error
    if (err) {
      console.log(err);
      return res.status(401).send({ message: 'Unauthorized Access' })
    }
    // If Token Is Valid Then It Would Be Decoded
    console.log('value In The Token', decoded);
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('HMend').collection('services');
    const bookingCollection = client.db('HMend').collection('booking');

    // Create A Middlewares
    const logger = async (req, res, next) => {
      console.log('Called:', req.host, req.originalUrl);
      next();
    }
    // JWT Token
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
      }).send({ success: true });
    })


    // 
    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray()
      res.send(result);
    });

    // Create Booking
    app.post('/services', async (req, res) => {
      const services = req.body;
      const result = await serviceCollection.insertOne(services);
      res.send(result);
    });

    // Booking Delete
    app.delete('/cancel-booking/:bookingId', async (req, res) => {
      const id = req.params.bookingId;
      const query = {
        _id: new ObjectId(id)
      };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // 
    app.get('/booking', logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log('Token Owner Info', req.user);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await bookingCollection.find(query).toArray();
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


app.listen(port, () => {
  console.log(`HMend Server Is Running On Port ${port}`)
});