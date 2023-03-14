// VARIABLE ENV
require('dotenv').config()

// IMPORT DES DATAS
const users = require("./data/users");
const posts = require("./data/posts");
const comments = require("./data/comments");

// MONGO ===
const MONGO_URI = process.env.MONGO_URI;
const { MongoClient } = require('mongodb');

// Connection URL
const client = new MongoClient(MONGO_URI);

// Database Name
const dbName = 'social-network';

async function main() {
    // Use connect method to connect to the server
    await client.connect();
    console.log('Connected successfully to server');
    const db = client.db(dbName);
    const userCollection = db.collection('users');
    const postCollection = db.collection('posts');
    const commentCollection = db.collection('comments');

    // the following code examples can be pasted here...

    const generateUserCollection = () => users.length > 0 ? userCollection.insertMany(users.map(user => { return { ...user, 'createdAt': new Date() } })) : null;
    const generatePostCollection = () => posts.length > 0 ? postCollection.insertMany(posts) : null;
    const generateCommentCollection = () => comments.length > 0 ? commentCollection.insertMany(comments) : null;
    const dropUserCollection = () => userCollection.deleteMany({})
    const dropPostCollection = () => postCollection.deleteMany({});
    const dropCommentCollection = () => commentCollection.deleteMany({});

    const regenerateDB = async () => {
        // CLEAN DB
        await dropUserCollection();
        await dropPostCollection();
        await dropCommentCollection();
        // POPULATE DB
        await generateUserCollection();
        await generatePostCollection();
        await generateCommentCollection();
    }

    await regenerateDB();

    // Fonction simple
    const deleteOneUser = (name) => userCollection.deleteOne({ username: name });
    const updateOneUserName = (username, nextUserName) => userCollection.updateOne({ username }, { $set: { username: nextUserName } });
    const getUserId = (username) => userCollection.findOne({ username }, { projection: { _id: 1 } });
    const createOnePost = async (username, imageUrl, description) => {
        const user = await getUserId(username);
        return postCollection.insertOne({
            userId: user._id,
            imageUrl,
            description,
            createdAt: new Date()
        })
    }
    const getPosts = async () => {
        const lookupUser = [{
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        }, { $unwind: "$user" }, { $project: { userId: 0 } }];
        const posts = await postCollection.aggregate([
            {
                $lookup: {
                    from: "comments",
                    localField: "comments",
                    foreignField: "_id",
                    as: "comments",
                    pipeline: [...lookupUser]
                }
            }, ...lookupUser]).toArray();
        console.log(posts);
    }
    const addCommentToPost = async (username, comment, postIndex = 0) => {
        const user = await getUserId(username);
        const insertedComment = await commentCollection.insertOne({
            userId: user._id,
            comment,
            createdAt: new Date()
        });
        const posts = await postCollection.find().toArray();
        await postCollection.updateOne({ _id: posts[postIndex]._id }, { $push: { comments: insertedComment.insertedId } });
    }

    await createOnePost("Jean Eude", "https://lemagdesanimaux.ouest-france.fr/images/dossiers/2021-02/lemurien-071053.jpg", "Je suis la description de Jean Eude");
    await createOnePost("John Do", "https://lemagdesanimaux.ouest-france.fr/images/dossiers/2021-02/lemurien-071053.jpg", "Je suis la description de John Do");
    await createOnePost("Martin Bougue", "https://lemagdesanimaux.ouest-france.fr/images/dossiers/2021-02/lemurien-071053.jpg", "Je suis la description de Martin Bougue");

    await addCommentToPost("Jean Eude", "Bouyaaaaaaaaa", 0);
    await addCommentToPost("Jean Eude", "BESSSSSSSSS", 1);
    await addCommentToPost("Jean Eude", "MIAAAAAMMMMM", 2);

    await getPosts();
    return 'done.';
}



main()
    .then(console.log)
    .catch(console.error)
    .finally(() => client.close());