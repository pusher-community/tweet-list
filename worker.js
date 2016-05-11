require('dotenv').config()

const tweets = require('tweets')
const pusher = require('pusher')
const Redis = require('ioredis')
const redis = new Redis(process.env.REDIS_URL)

const stream = new tweets({
  consumer_key:        process.env.tw_consumer_key,
  consumer_secret:     process.env.tw_consumer_secret,
  access_token:        process.env.tw_access_token,
  access_token_secret: process.env.tw_access_token_secret
})

stream
  .filter({track: process.env.tw_term || 'pizza'})

stream
  .on('tweet', t => {
    const data = {
      text: t.text,
      id_str: t.id_str,
      name: t.user.name,
      screen_name: t.user.screen_name,
      img: t.user.profile_image_url_https,
      link: `https://twitter.com/${t.user.screen_name}/status/${t.id_str}`
    }
    console.log("Got a tweet!", data)

    // store in redis
    redis.multi()
      .lpush('tweets', JSON.stringify(data))
      .ltrim('tweets', 0, 50)
      .exec()
      .then(
        c => console.log('saved'),
        e => console.error('error:', e)
      )

    // todo publish
  })

stream
  .on('reconnect', e =>
    console.log(`reconecting (${e.type})`, e)
  )
