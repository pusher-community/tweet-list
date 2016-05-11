require('dotenv').config()

const fs = require('fs')
const Mustache = require('mustache')
const express = require('express')
const app = express()
const Redis = require('ioredis')
const redis = new Redis(process.env.REDIS_URL)


app.use(express.static('public'))

const tweets = () =>
  redis
    .lrange('tweets', 0, -1)
    .then( result => result.map(JSON.parse) )

app.get('/json', (req, res, next) =>
  tweets()
    .then(res.send.bind(res))
    .catch(next)
)

app.get('/csv', (req, res, next) => {
  res.set('Content-Type', 'text/csv')
  tweets()
    .then(tweets => {
      res.send(
        csv(['id_str','screen_name','text','name','img'], tweets)
      )
    })
    .catch(next)
})


const tmpl = fs.readFileSync('./public/index.tmpl.html').toString()
app.get('/', (req, res, next) => {
  tweets()
    .then(tweets =>
      res.send(Mustache.render(tmpl, {tweets: tweets}))
    )
    .catch(next)
})


app.get('/config', (req, res) => {
  res.send({
    key: process.env.p_key,
    cluster: process.env.p_cluster
  })
})

app.listen(process.env.PORT || 3000)


const csv_row = _ =>
  _.map(i =>
    i.toString()
    .replace(/["\n]/g,'')
  ).join(',') + '\n'

const csv = (cols, data) =>
  csv_row(cols) + data.reduce(
    (csv, row) => csv + csv_row(cols.map( c => row[c] ))
  )
