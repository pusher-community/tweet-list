require('dotenv').config()

const tweets = require('tweets')
const Pusher = require('pusher')
const Redis = require('ioredis')
const redis = new Redis(process.env.REDIS_URL)

const stream = new tweets({
  consumer_key:        process.env.tw_consumer_key,
  consumer_secret:     process.env.tw_consumer_secret,
  access_token:        process.env.tw_access_token,
  access_token_secret: process.env.tw_access_token_secret
})

const pusher = new Pusher({
  appId: process.env.p_app_id,
  key: process.env.p_key,
  secret: process.env.p_secret,
  cluster: process.env.p_cluster,
  encrypted: true
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
      link: `https://twitter.com/${t.user.screen_name}/status/${t.id_str}`,
      created_at: t.created_at
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

    // publish with pusher
    pusher.trigger(process.env.p_channel, 'tweet', data)

  })

stream
  .on('reconnect', e =>
    console.log(`reconecting (${e.type})`, e)
  )
