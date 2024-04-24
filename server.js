const express = require('express')
const app = express()
const { MongoClient, ObjectId } = require('mongodb')

const methodOverride = require('method-override')
// const connectDB = require('./database.js')

require('dotenv').config()
app.use(methodOverride('_method'))

app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs')

//요청.body 쓰려면 필요
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

let connectDB = require('./database.js') //database.js 파일 경로
let db;
// const url = process.env.DB_URL;
// new MongoClient(url).connect().then((client) => {
connectDB.then((client) => {
    console.log('DB연결성공')
    db = client.db('forum');
    app.listen(process.env.PORT, () => {
        console.log('http://localhost:8080 에서 서버 실행중')
    })
}).catch((err) => {
    console.log(err)
})

function 미들웨어함수(요청, 응답, next) {

    if (!요청.user) {
        응답.send('로그인하세요')
    }
    //next = 미들웨어 코드실행 끝났으니 다음으로 이동해주세요
    next()
}

// app.use(미들웨어함수) //이거 밑에 있는 모든 api는 미들웨어함수 적용됨

// 미들웨어함수에 (요청,응답) 담아서 자동으로 먼저 실행됨
// app.get('/', 미들웨어함수, (요청, 응답) => {
//     응답.sendFile(__dirname + '/index.html')
// })

app.get('/', (요청, 응답) => {
    응답.sendFile(__dirname + '/index.html')
})

app.get('/news', (요청, 응답) => {
    db.collection('post').insertOne({ title: '어쩌' })
    // 응답.send('오늘 비옴')
})

app.get('/list', async (요청, 응답) => {//모든 컬렉션 출력
    let result = await db.collection('post').find().toArray()
    console.log(result[0].title)
    // 응답.send(result[0])

    응답.render('list.ejs', { 글목록: result }) //서버데이터를 ejs 파일에 넣으려면
})

app.get('/write', (요청, 응답) => {
    응답.render('write.ejs')
})

app.post('/add', async (요청, 응답) => {
    console.log(요청.body)
    //{ title: '제목', content: '내용' }

    try {
        if (요청.body.title == '') {
            응답.send('제목입력안했는데?')
        } else {
            await db.collection('post').insertOne({
                title: 요청.body.title,
                content: 요청.body.content
            })
            응답.redirect('/list')
        }
    } catch (e) {
        console.log(e)
        응답.status(500).send('서버에러남')
    }
})

// /detail/1 /detail/2 로 접속해도 밑 코드 실행
app.get('/detail/:id', async (요청, 응답) => {

    try {
        let result2 = await db.collection('comment').find({ parentId: new ObjectId(요청.params.id) }).toArray()
        let THISresult = await db.collection('post').findOne({
            _id: new ObjectId(요청.params.id)
        })
        // console.log(요청.params)
        if (THISresult == null) {
            응답.status(400).send('이상한 url 입력함')
        } else {
            응답.render('detail.ejs', { resultPUT: THISresult, result2: result2 })
        }
    } catch (e) {
        console.log(e)
        응답.status(404).send('이상한 url 입력함')
    }
})

app.put('/edit', async (요청, 응답) => {
    //     await db.collection('post').updateOne({ _id: 1 },
    //         { $inc: { like: -2 } })

    // })
    await db.collection('post').updateOne({ _id: new ObjectId(요청.body.id) },
        { $set: { title: 요청.body.title, content: 요청.body.content } })
    //{ $set: { title: 새로운글제목, content: 새로운내용 } })
    // let result = await db.collection('post').findOne({ _id: new ObjectId(요청.params.id) })
    // 응답.render('edit.ejs', { result: result })
    console.log(요청.body)
    응답.redirect('/list')
})

// app.post('/abc', async (요청, 응답) => {
//     console.log('인녕')
//     console.log(요청.body)
// })
app.get('/abc', async (요청, 응답) => {
    console.log(요청.query)
})

app.delete('/delete', async (요청, 응답) => {
    // db에 있던 document 삭제하기~
    // console.log(요청.query) 
    // { docid: '66279ac228804bd05751332c' }
    await db.collection('post').deleteOne({ _id: new ObjectId(요청.query.docid) })
    응답.send('삭제완료')
})

app.get('/list/:id', async (요청, 응답) => {//모든 컬렉션 출력
    let result = await db.collection('post').find()
        .skip((요청.params.id - 1) * 5).limit(5).toArray()

    응답.render('list.ejs', { 글목록: result }) //서버데이터를 ejs 파일에 넣으려면
})

//이게 더빠름 (단점 : 버튼 하나밖에 못만듬)
// app.get('/list/next/:id', async (요청, 응답) => {//모든 컬렉션 출력
//     let result = await db.collection('post')
//         .find({ _id: { $gt: new ObjectId(요청.params.id) } })
//         .limit(5).toArray()

//     응답.render('list.ejs', { 글목록: result }) //서버데이터를 ejs 파일에 넣으려면
// })

// app.get('/search', async (요청, 응답) => {
//     // console.log(요청.query.val)
//     let result = await db.collection('post')
//         .find({ $text: { $search: 요청.query.val } }).
//         toArray()
//     응답.render('search.ejs', { 글목록: result })
// })

app.get('/search', async (요청, 응답) => {
    let 검색조건 = [
        {
            $search: {
                index: 'title_index',
                text: { query: 요청.query.val, path: 'title' }
            }
        },
    ]
    let result = await db.collection('post').aggregate(검색조건).toArray()
    응답.render('search.ejs', { 글목록: result })
})

app.post('/comment', async (요청, 응답) => {
    await db.collection('comment').insertOne({
        content: 요청.body.content,
        // writerID: new ObjectId(요청.user._id),
        // writer: 요청.user.username,
        parentId: new ObjectId(요청.body.parentId)
    })
    응답.redirect('back')
})

app.use('/shop', require('./routes/shop.js'))
